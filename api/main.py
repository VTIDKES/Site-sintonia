"""
API do portal de Sistemas de Controle.

Serve as questões sem o gabarito, corrige as respostas no servidor
e grava cada tentativa como um documento JSON no MongoDB.

Variáveis de ambiente esperadas:
  MONGODB_URI      string de conexão do Atlas (obrigatória)
  MONGODB_BANCO    nome do banco (padrão: portal_controle)
  ORIGENS          domínios liberados no CORS, separados por vírgula
  CHAVE_PROFESSOR  token para consultar e exportar as respostas
"""

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from pymongo import ASCENDING, MongoClient
from pymongo.errors import PyMongoError

# --------------------------------------------------------------------------
# configuração
# --------------------------------------------------------------------------

_AQUI = Path(__file__).parent
BANCO_JSON = json.loads((_AQUI / "banco.json").read_text("utf-8"))
AVALIACAO = json.loads((_AQUI / "avaliacao.json").read_text("utf-8"))

MONGODB_URI = os.environ.get("MONGODB_URI", "")
NOME_BANCO = os.environ.get("MONGODB_BANCO", "portal_controle")
CHAVE_PROFESSOR = os.environ.get("CHAVE_PROFESSOR", "")

ORIGENS = [o.strip() for o in os.environ.get("ORIGENS", "").split(",") if o.strip()]
if not ORIGENS:
    # sem a variável definida, só o desenvolvimento local passa
    ORIGENS = ["http://localhost:8000", "http://127.0.0.1:8000"]

app = FastAPI(title="Portal de Sistemas de Controle", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGENS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Chave"],
)

_cliente: Optional[MongoClient] = None


def colecao():
    """Conexão preguiçosa: só abre quando a primeira requisição precisa."""
    global _cliente
    if not MONGODB_URI:
        raise HTTPException(503, "MONGODB_URI não configurada no serviço")
    if _cliente is None:
        _cliente = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=8000, tz_aware=True)
        col = _cliente[NOME_BANCO]["respostas"]
        col.create_index([("aula", ASCENDING), ("enviado_em", ASCENDING)])
        col.create_index([("matricula", ASCENDING)])
        _cliente[NOME_BANCO]["avaliacoes"].create_index([("enviado_em", ASCENDING)])
    return _cliente[NOME_BANCO]["respostas"]


def colecao_avaliacoes():
    colecao()  # garante conexão e índices
    return _cliente[NOME_BANCO]["avaliacoes"]


# --------------------------------------------------------------------------
# modelos
# --------------------------------------------------------------------------

class Envio(BaseModel):
    aula: str
    nome: str = Field(min_length=2, max_length=80)
    matricula: str = Field(min_length=1, max_length=30)
    turma: str = Field(default="", max_length=40)
    respostas: Dict[str, str]
    duracao_s: int = Field(default=0, ge=0, le=86400)

    @field_validator("aula")
    @classmethod
    def aula_valida(cls, v: str) -> str:
        if v not in BANCO_JSON:
            raise ValueError("aula desconhecida")
        return v

    @field_validator("nome", "turma")
    @classmethod
    def limpa_texto(cls, v: str) -> str:
        return re.sub(r"\s+", " ", v).strip()

    @field_validator("matricula")
    @classmethod
    def limpa_matricula(cls, v: str) -> str:
        return re.sub(r"[^A-Za-z0-9._-]", "", v).strip()

    @field_validator("respostas")
    @classmethod
    def respostas_no_formato(cls, v: Dict[str, str]) -> Dict[str, str]:
        if not v or len(v) > 60:
            raise ValueError("quantidade de respostas fora do previsto")
        for chave, valor in v.items():
            if not re.fullmatch(r"[a-z0-9]{1,8}", chave) or valor not in "abcd":
                raise ValueError("resposta em formato inválido")
        return v


_IDS_ITENS = {i["id"] for i in AVALIACAO["itens"]}
_IDS_PERFIL = {p["id"] for p in AVALIACAO["perfil"]}
_IDS_ABERTAS = {a["id"] for a in AVALIACAO["abertas"]}
_REVERSOS = {i["id"] for i in AVALIACAO["itens"] if i.get("reverso")}
_DIM = {i["id"]: i["dim"] for i in AVALIACAO["itens"]}
_MAXESC = AVALIACAO["escala"]["maximo"]


class EnvioAvaliacao(BaseModel):
    """Avaliação da ferramenta. Anônima por construção: não há campo de identificação."""

    respostas: Dict[str, int]
    perfil: Dict[str, str] = Field(default_factory=dict)
    abertas: Dict[str, str] = Field(default_factory=dict)
    duracao_s: int = Field(default=0, ge=0, le=86400)

    @field_validator("respostas")
    @classmethod
    def escala_valida(cls, v: Dict[str, int]) -> Dict[str, int]:
        if not v:
            raise ValueError("nenhum item respondido")
        for chave, nota in v.items():
            if chave not in _IDS_ITENS:
                raise ValueError("item desconhecido: %s" % chave)
            if not isinstance(nota, int) or not (1 <= nota <= _MAXESC):
                raise ValueError("nota fora da escala")
        return v

    @field_validator("perfil")
    @classmethod
    def perfil_valido(cls, v: Dict[str, str]) -> Dict[str, str]:
        return {k: str(x)[:60] for k, x in v.items() if k in _IDS_PERFIL}

    @field_validator("abertas")
    @classmethod
    def abertas_validas(cls, v: Dict[str, str]) -> Dict[str, str]:
        return {
            k: re.sub(r"\s+", " ", str(x)).strip()[:1200]
            for k, x in v.items()
            if k in _IDS_ABERTAS and str(x).strip()
        }


def _pontua(respostas: Dict[str, int]) -> Dict[str, float]:
    """Aplica a inversão dos itens reversos e devolve as notas já corrigidas."""
    return {
        k: float(_MAXESC + 1 - n) if k in _REVERSOS else float(n)
        for k, n in respostas.items()
    }


def _media(v: List[float]) -> Optional[float]:
    return round(sum(v) / len(v), 2) if v else None


def _variancia(v: List[float]) -> float:
    """Variância amostral, denominador n-1."""
    n = len(v)
    if n < 2:
        return 0.0
    m = sum(v) / n
    return sum((x - m) ** 2 for x in v) / (n - 1)


def _cronbach(matriz: List[List[float]]) -> Optional[float]:
    """Alfa de Cronbach. Cada linha é um respondente, cada coluna um item."""
    if len(matriz) < 3 or not matriz[0]:
        return None
    k = len(matriz[0])
    if k < 2:
        return None
    soma_var_itens = sum(_variancia([linha[j] for linha in matriz]) for j in range(k))
    var_total = _variancia([sum(linha) for linha in matriz])
    if var_total == 0:
        return None
    return round((k / (k - 1)) * (1 - soma_var_itens / var_total), 3)


# --------------------------------------------------------------------------
# rotas públicas
# --------------------------------------------------------------------------

@app.get("/saude")
def saude():
    """Usada pela página para acordar o serviço antes do aluno terminar de digitar."""
    return {"ok": True, "hora": datetime.now(timezone.utc).isoformat()}


@app.get("/questionarios")
def questionarios():
    return [
        {"aula": aula, "titulo": d["titulo"], "questoes": len(d["questoes"])}
        for aula, d in BANCO_JSON.items()
    ]


@app.get("/questionario/{aula}")
def questionario(aula: str):
    """Devolve enunciados e alternativas. O gabarito nunca sai do servidor."""
    if aula not in BANCO_JSON:
        raise HTTPException(404, "questionário não encontrado")
    d = BANCO_JSON[aula]
    return {
        "aula": aula,
        "titulo": d["titulo"],
        "questoes": [
            {"id": q["id"], "enunciado": q["enunciado"], "alternativas": q["alternativas"]}
            for q in d["questoes"]
        ],
    }


@app.post("/respostas")
def registrar(envio: Envio):
    questoes = BANCO_JSON[envio.aula]["questoes"]

    detalhe: List[dict] = []
    acertos = 0
    for q in questoes:
        marcada = envio.respostas.get(q["id"])
        certa = marcada == q["correta"]
        if certa:
            acertos += 1
        detalhe.append(
            {
                "id": q["id"],
                "marcada": marcada,
                "correta": q["correta"],
                "acertou": certa,
                "explicacao": q["explicacao"],
            }
        )

    total = len(questoes)
    documento = {
        "aula": envio.aula,
        "titulo": BANCO_JSON[envio.aula]["titulo"],
        "nome": envio.nome,
        "matricula": envio.matricula,
        "turma": envio.turma,
        "respostas": {d["id"]: d["marcada"] for d in detalhe},
        "detalhe": [{k: v for k, v in d.items() if k != "explicacao"} for d in detalhe],
        "acertos": acertos,
        "total": total,
        "percentual": round(100 * acertos / total, 1) if total else 0.0,
        "duracao_s": envio.duracao_s,
        "enviado_em": datetime.now(timezone.utc),
    }

    gravado = False
    try:
        r = colecao().insert_one(dict(documento))
        gravado = r.acknowledged
    except (PyMongoError, HTTPException):
        # a correção é devolvida de qualquer forma: o aluno não perde o trabalho
        pass

    return JSONResponse(
        {
            "acertos": acertos,
            "total": total,
            "percentual": documento["percentual"],
            "detalhe": detalhe,
            "gravado": gravado,
        }
    )


@app.get("/avaliacao")
def instrumento():
    """Devolve o questionário de validação da ferramenta."""
    return AVALIACAO


@app.post("/avaliacao")
def registrar_avaliacao(envio: EnvioAvaliacao):
    corrigidas = _pontua(envio.respostas)

    por_dim: Dict[str, List[float]] = {}
    for item, nota in corrigidas.items():
        por_dim.setdefault(_DIM[item], []).append(nota)

    documento = {
        "instrumento": AVALIACAO["codigo"],
        "respostas": envio.respostas,
        "corrigidas": corrigidas,
        "perfil": envio.perfil,
        "abertas": envio.abertas,
        "medias_dimensao": {d: _media(v) for d, v in por_dim.items()},
        "media_geral": _media(list(corrigidas.values())),
        "itens_respondidos": len(corrigidas),
        "itens_total": len(AVALIACAO["itens"]),
        "duracao_s": envio.duracao_s,
        "enviado_em": datetime.now(timezone.utc),
    }

    gravado = False
    try:
        gravado = colecao_avaliacoes().insert_one(dict(documento)).acknowledged
    except (PyMongoError, HTTPException):
        pass

    return JSONResponse(
        {
            "media_geral": documento["media_geral"],
            "medias_dimensao": documento["medias_dimensao"],
            "dimensoes": AVALIACAO["dimensoes"],
            "gravado": gravado,
        }
    )


# --------------------------------------------------------------------------
# rotas do professor
# --------------------------------------------------------------------------

def confere_chave(chave: Optional[str]):
    if not CHAVE_PROFESSOR:
        raise HTTPException(503, "CHAVE_PROFESSOR não configurada no serviço")
    if chave != CHAVE_PROFESSOR:
        raise HTTPException(401, "chave inválida")


@app.get("/relatorio")
def relatorio(
    aula: Optional[str] = None,
    limite: int = Query(default=500, ge=1, le=5000),
    x_chave: Optional[str] = Header(default=None, alias="X-Chave"),
):
    """Lista as tentativas em JSON, da mais recente para a mais antiga."""
    confere_chave(x_chave)
    filtro = {"aula": aula} if aula else {}
    itens = []
    for d in colecao().find(filtro).sort("enviado_em", -1).limit(limite):
        d["_id"] = str(d["_id"])
        d["enviado_em"] = d["enviado_em"].isoformat()
        itens.append(d)
    return {"total": len(itens), "itens": itens}


@app.get("/resumo")
def resumo(x_chave: Optional[str] = Header(default=None, alias="X-Chave")):
    """Média e contagem por aula, mais o índice de acerto de cada questão."""
    confere_chave(x_chave)
    col = colecao()

    por_aula = list(
        col.aggregate(
            [
                {
                    "$group": {
                        "_id": "$aula",
                        "tentativas": {"$sum": 1},
                        "media": {"$avg": "$percentual"},
                        "alunos": {"$addToSet": "$matricula"},
                    }
                },
                {
                    "$project": {
                        "aula": "$_id",
                        "_id": 0,
                        "tentativas": 1,
                        "media": {"$round": ["$media", 1]},
                        "alunos": {"$size": "$alunos"},
                    }
                },
                {"$sort": {"aula": 1}},
            ]
        )
    )

    por_questao = list(
        col.aggregate(
            [
                {"$unwind": "$detalhe"},
                {
                    "$group": {
                        "_id": "$detalhe.id",
                        "respostas": {"$sum": 1},
                        "acertos": {"$sum": {"$cond": ["$detalhe.acertou", 1, 0]}},
                    }
                },
                {
                    "$project": {
                        "questao": "$_id",
                        "_id": 0,
                        "respostas": 1,
                        "acerto_pct": {
                            "$round": [
                                {"$multiply": [100, {"$divide": ["$acertos", "$respostas"]}]},
                                1,
                            ]
                        },
                    }
                },
                {"$sort": {"acerto_pct": 1}},
            ]
        )
    )

    return {"por_aula": por_aula, "por_questao": por_questao}


@app.get("/avaliacao/resumo")
def resumo_avaliacao(x_chave: Optional[str] = Header(default=None, alias="X-Chave")):
    """Estatísticas do instrumento de validação, prontas para relatório.

    Traz média e desvio por item e por dimensão, a distribuição de cada item,
    o alfa de Cronbach de cada dimensão e do instrumento inteiro, além do
    perfil da amostra e das respostas abertas.
    """
    confere_chave(x_chave)
    docs = list(colecao_avaliacoes().find({"instrumento": AVALIACAO["codigo"]}))
    n = len(docs)
    if n == 0:
        return {"n": 0, "aviso": "nenhuma resposta registrada ainda"}

    itens = [i["id"] for i in AVALIACAO["itens"]]

    # por item
    por_item = []
    for item in itens:
        notas = [d["corrigidas"][item] for d in docs if item in d.get("corrigidas", {})]
        brutas = [d["respostas"][item] for d in docs if item in d.get("respostas", {})]
        if not notas:
            continue
        texto = next(i["texto"] for i in AVALIACAO["itens"] if i["id"] == item)
        por_item.append(
            {
                "item": item,
                "dimensao": _DIM[item],
                "texto": texto,
                "reverso": item in _REVERSOS,
                "n": len(notas),
                "media": _media(notas),
                "desvio": round(_variancia(notas) ** 0.5, 2),
                "distribuicao": {str(k): brutas.count(k) for k in range(1, _MAXESC + 1)},
            }
        )

    # por dimensão, com alfa
    por_dim = []
    for sigla, nome in AVALIACAO["dimensoes"].items():
        ids = [i for i in itens if _DIM[i] == sigla]
        notas = [v for d in docs for k, v in d.get("corrigidas", {}).items() if k in ids]
        matriz = [
            [d["corrigidas"][i] for i in ids]
            for d in docs
            if all(i in d.get("corrigidas", {}) for i in ids)
        ]
        por_dim.append(
            {
                "dimensao": sigla,
                "nome": nome,
                "itens": len(ids),
                "media": _media(notas),
                "desvio": round(_variancia(notas) ** 0.5, 2) if notas else None,
                "alfa_cronbach": _cronbach(matriz),
                "respondentes_completos": len(matriz),
            }
        )

    matriz_geral = [
        [d["corrigidas"][i] for i in itens]
        for d in docs
        if all(i in d.get("corrigidas", {}) for i in itens)
    ]

    perfil = {}
    for p in AVALIACAO["perfil"]:
        cont = {}
        for d in docs:
            v = d.get("perfil", {}).get(p["id"])
            if v:
                cont[v] = cont.get(v, 0) + 1
        perfil[p["id"]] = {"pergunta": p["pergunta"], "contagem": cont}

    abertas = {}
    for a in AVALIACAO["abertas"]:
        abertas[a["id"]] = {
            "pergunta": a["pergunta"],
            "respostas": [
                d["abertas"][a["id"]] for d in docs if d.get("abertas", {}).get(a["id"])
            ],
        }

    duracoes = [d.get("duracao_s", 0) for d in docs if d.get("duracao_s")]

    return {
        "instrumento": AVALIACAO["codigo"],
        "n": n,
        "respondentes_completos": len(matriz_geral),
        "media_geral": _media([v for d in docs for v in d.get("corrigidas", {}).values()]),
        "alfa_cronbach_geral": _cronbach(matriz_geral),
        "duracao_mediana_s": sorted(duracoes)[len(duracoes) // 2] if duracoes else None,
        "por_dimensao": por_dim,
        "por_item": sorted(por_item, key=lambda x: x["media"]),
        "perfil": perfil,
        "abertas": abertas,
    }
