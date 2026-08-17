# Portal de Sistemas de Controle

Site estático da disciplina. Serve as aulas em markdown com LaTeX e dá acesso ao Simulador CSS, que roda no Streamlit.

## Arquivos

| Arquivo | O que faz |
|---|---|
| `index.html` | Página inicial com o diagrama de blocos navegável |
| `aula.html` | Leitor que renderiza qualquer arquivo de `conteudo/` |
| `simulador.html` | Embute o Simulador CSS em um iframe |
| `animacoes.js` | Animações didáticas inseridas automaticamente nas aulas |
| `config.js` | Único lugar com o endereço da API |
| `questionario.html` + `.js` | Questionários de conteúdo |
| `avaliacao.html` + `.js` | Avaliação do portal |
| `painel.html` + `.js` | Painel de resultados, protegido por chave |
| `CHECKLIST.md` | Passo a passo do deploy |
| `estilo.css` | Toda a identidade visual, arquivo único |
| `conteudo/*.md` | As aulas e os documentos de teoria |
| `render.yaml` | Blueprint do Render |

## Como adicionar uma aula

1. Salve o arquivo em `conteudo/`, por exemplo `05_lugar_das_raizes.md`.
2. Acrescente um item na lista da seção "Aulas" em `index.html`:
   `<li><a href="aula.html?f=05_lugar_das_raizes">5. Lugar das raízes</a><span>Aula</span></li>`
3. `git push`. Não precisa mexer em mais nada.

O nome do arquivo só pode ter letras, números, hífen e sublinhado. O leitor aceita LaTeX com `$...$` e `$$...$$`, tabelas GFM, blocos de código, SVG embutido e os callouts do Obsidian (`> [!tip]`, `> [!warning]`).

## Animações

O `animacoes.js` insere animações em canvas dentro das aulas, sem que os arquivos `.md` precisem de qualquer marcação. Cada uma tem botão de pausar e reiniciar, para em segundo plano quando sai da tela e respeita `prefers-reduced-motion`.

| Animação | Onde entra |
|---|---|
| Funções singulares, uma virando a outra por integração | aula 01 |
| Malha aberta contra malha fechada diante de perturbação | aula 01 |
| Convolução deslizante com a área de sobreposição | aula 02 |
| Polos caminhando no plano s e a resposta correspondente | aulas 02, 04 e elétricos |
| Circuito RC carregando com τ marcado | aula 03 e elétricos |
| Massa-mola-amortecedor nos três regimes | aula 04 e mecânicos |
| Três estados de equilíbrio sob a mesma perturbação | aula 06 |
| Polo cruzando o eixo imaginário | aula 06 |
| Varredura em frequência com o ponto correndo no Bode | aula 07 |
| Percurso da curva de Nyquist e distância até -1 | aula 08 |
| Trajetória no plano de estados | aula 09 e mecânicos |
| Ganho de malha fechada movendo o polo e reduzindo o erro | aula 05 |
| Lugar das raízes sendo percorrido até cruzar o eixo | aula 10 |
| P, PI e PID comparados na mesma planta | aula 11 |
| Bolha de fase do compensador de avanço | aula 12 |
| Frações parciais somando os modos da resposta | aula 02 |
| Zero deslizando até a fase não mínima | aula 03 |
| Margens de ganho e de fase medidas no Bode | aula 07 |
| Curva de Nyquist inflando com o ganho | aula 08 |
| Retratos de fase: nó, foco, sela e centro | aula 09 |
| Windup do integrador, com e sem proteção | aula 11 |
| Ganho DC do compensador de atraso | aula 12 |

Para mudar onde uma animação aparece, edite o objeto `MAPA` no fim do `animacoes.js`. O campo `apos` é um trecho do título da seção, sem precisar de acento nem do texto completo.

## Aulas publicadas

01 sinais e sistemas · 02 Laplace · 03 dinâmica de 1ª ordem · 04 dinâmica de 2ª ordem · 05 sistemas com realimentação · 06 estabilidade e Routh-Hurwitz · 07 resposta em frequência e Bode · 08 critério de Nyquist · 09 espaço de estados · 10 lugar das raízes · 11 controladores PID e sintonia · 12 compensadores de avanço e atraso

Referências de modelagem: sistemas elétricos (RC, RLC, PID com amp-op) e sistemas mecânicos (massa-mola-amortecedor).

## Como a matemática é renderizada

O `aula.html` **isola as fórmulas antes de passar o texto pelo marked**. Sem isso o parser de markdown consome as barras invertidas e três coisas quebram:

- `\right\}` vira `\right}` e o KaTeX falha, mostrando o LaTeX cru em vermelho
- o `\\` que separa linhas de matriz desaparece e a `bmatrix` colapsa
- a barra vertical do módulo, como em `|H(jw)|`, é lida como divisor de coluna e parte a tabela ao meio

O leitor troca cada fórmula por um marcador, roda o markdown, e só então devolve o HTML já renderizado pelo KaTeX no lugar do marcador. Blocos de código são preservados na mesma varredura, então `%s` e afins do Scilab passam intactos.

## Simulador CSS

O `simulador.html` aponta para `https://projeto-css-sintonia-ifrn.streamlit.app/`. O `?embed=true` no iframe é obrigatório, senão o Streamlit Community Cloud recusa a exibição dentro da página. Apps sem acesso por cerca de sete dias hibernam e pedem um clique para acordar, então vale abrir uma vez antes da aula.

## Deploy no Render

Com o `render.yaml` no repositório: **New → Blueprint**, conecte o repo, pronto.

Manualmente: **New → Static Site**, Build Command vazio, Publish Directory `.`

Todos os arquivos precisam estar na raiz do repositório, com a pasta `conteudo/` junto. Static Site no Render é gratuito e não hiberna.

## Bibliotecas

Carregadas por CDN apenas no leitor de aulas: `marked` para o markdown e `KaTeX` para as fórmulas.

---

# Questionários com MongoDB

O portal continua sendo um Static Site. Quem fala com o banco é um Web Service separado, na pasta `api/`.

## Por que precisa de um backend

Um site estático não pode conectar no MongoDB: a string de conexão iria no JavaScript, visível para qualquer aluno que abrisse o inspetor. O atalho que existia para isso, a **Atlas Data API**, foi removido junto com todo o Atlas App Services em **30 de setembro de 2025**. A própria MongoDB hoje recomenda subir uma API própria.

Há um segundo motivo, pedagógico: **o gabarito nunca sai do servidor**. A rota pública devolve só enunciados e alternativas; a correção acontece no backend. Sem isso, bastaria abrir o inspetor para ver as respostas.

## Arquitetura

```
navegador                Static Site              Web Service            MongoDB Atlas
questionario.html  -->   (não hiberna)     -->    api/main.py     -->    banco portal_controle
                                                  FastAPI                coleção respostas
```

## Rotas

| Método | Rota | Para quê |
|---|---|---|
| GET | `/saude` | Acorda o serviço e confirma que está no ar |
| GET | `/questionarios` | Lista as aulas com questionário |
| GET | `/questionario/{aula}` | Enunciados e alternativas, **sem gabarito** |
| POST | `/respostas` | Corrige, grava e devolve o resultado com explicações |
| GET | `/relatorio` | Tentativas em JSON. Exige o cabeçalho `X-Chave` |
| GET | `/resumo` | Média por aula e índice de acerto por questão. Exige `X-Chave` |

## O documento gravado

```json
{
  "aula": "06_estabilidade",
  "titulo": "6. Estabilidade e Routh-Hurwitz",
  "nome": "Fulano de Tal",
  "matricula": "20210001",
  "turma": "ENE-2026.1",
  "respostas": { "06a": "b", "06b": "b", "06c": "b", "06d": "a" },
  "detalhe": [ { "id": "06a", "marcada": "b", "correta": "b", "acertou": true } ],
  "acertos": 3,
  "total": 4,
  "percentual": 75.0,
  "duracao_s": 240,
  "enviado_em": "2026-08-17T12:00:00Z"
}
```

Dois índices são criados sozinhos na primeira requisição: `aula + enviado_em` e `matricula`.

## Como colocar no ar

1. **MongoDB Atlas**: crie um cluster gratuito M0, um usuário de banco e, em Network Access, libere `0.0.0.0/0`, porque o IP do Render não é fixo. Copie a string de conexão.
2. **Render**: com o `render.yaml` no repositório, use **New → Blueprint**. Os dois serviços sobem juntos.
3. No serviço `portal-controle-api`, aba **Environment**, preencha as duas variáveis marcadas como `sync: false`:
   - `MONGODB_URI` com a string do Atlas, incluindo a senha e o nome do banco
   - `CHAVE_PROFESSOR` com uma senha só sua, usada para ler os relatórios
4. Confira se `ORIGENS` bate exatamente com a URL do portal. É o CORS: se estiver errada, o navegador bloqueia o envio.
5. Em `questionario.js`, ajuste a constante `API` para a URL do Web Service.

## Consultando as respostas

```bash
# tudo de uma aula
curl -H "X-Chave: SUA_CHAVE" \
  "https://portal-controle-api.onrender.com/relatorio?aula=06_estabilidade"

# médias e as questões que mais derrubam a turma
curl -H "X-Chave: SUA_CHAVE" \
  "https://portal-controle-api.onrender.com/resumo"
```

O `/resumo` ordena as questões da menor para a maior taxa de acerto, então o topo da lista já mostra onde a turma está travando.

## A hibernação, e como ela foi tratada

O Web Service gratuito do Render dorme após 15 minutos sem acesso e leva perto de um minuto para acordar. Duas medidas suavizam isso:

- A página chama `/saude` assim que abre, enquanto o aluno ainda está digitando o nome. Quando ele terminar de responder, o serviço já está de pé.
- Se o Mongo falhar no momento do envio, a **correção é devolvida mesmo assim** e o aluno vê `gravado: false`. Ninguém perde o trabalho por causa do banco.

Para uma prova valendo nota, vale ligar o serviço uns minutos antes ou usar o plano pago de 7 dólares, que não hiberna.

## Editando as questões

Tudo fica em `api/banco.json`, uma entrada por aula. Para acrescentar uma questão, some um objeto ao vetor `questoes` com `id`, `enunciado`, `alternativas`, `correta` e `explicacao`. O `id` precisa ser único e usar só letras minúsculas e números. Nada mais precisa mudar: a lista, o formulário e a correção se ajustam sozinhos.

Como o arquivo mora dentro de `api/`, o gabarito não é servido pelo site estático.

---

# Avaliação do portal

Instrumento de validação da ferramenta, separado dos questionários de conteúdo. Aqui não existe resposta certa: são 20 itens em escala Likert de 1 a 5, distribuídos em cinco dimensões.

| Sigla | Dimensão | Itens |
|---|---|---|
| UP | Utilidade percebida | 4 |
| FU | Facilidade de uso | 4 |
| QC | Qualidade do conteúdo | 4 |
| RV | Recursos visuais e animações | 4 |
| IU | Satisfação e intenção de uso | 4 |

Mais quatro perguntas de perfil e três abertas.

## Decisões de instrumento

**É anônimo por construção.** O modelo `EnvioAvaliacao` não tem campo de nome nem de matrícula. Não é uma promessa na tela: não existe onde guardar. Isso reduz o viés de desejabilidade, que é justamente o risco de pedir para o aluno avaliar o material do professor.

**Dois itens são reversos**, `fu3` e `qc4`, redigidos na direção negativa. Servem para detectar quem marca tudo na mesma coluna sem ler. O servidor inverte a nota (6 − x) antes de agregar, então o relatório já sai na direção correta.

**A correção e a agregação ficam no servidor.** O navegador só envia as marcações.

## Rotas

| Método | Rota | Para quê |
|---|---|---|
| GET | `/avaliacao` | Devolve o instrumento completo |
| POST | `/avaliacao` | Grava e devolve as médias por dimensão |
| GET | `/avaliacao/resumo` | Estatísticas prontas para relatório. Exige `X-Chave` |

## O que o resumo entrega

```bash
curl -H "X-Chave: SUA_CHAVE" \
  "https://portal-controle-api.onrender.com/avaliacao/resumo"
```

- **n**, respondentes completos e duração mediana
- **Média e desvio por item**, com a distribuição de 1 a 5 de cada um
- **Média, desvio e alfa de Cronbach por dimensão**, mais o alfa do instrumento inteiro
- **Perfil da amostra** contado por opção
- **Respostas abertas** agrupadas por pergunta

Os itens vêm ordenados da menor para a maior média, então o topo da lista já aponta o que precisa melhorar no portal.

## Sobre o alfa de Cronbach

É a medida de consistência interna: verifica se os itens de uma dimensão estão medindo a mesma coisa. Acima de 0,70 costuma ser considerado aceitável em pesquisa aplicada.

O cálculo usa variância amostral e foi conferido contra o módulo `statistics` do Python. Precisa de pelo menos três respondentes completos; abaixo disso a rota devolve `null` em vez de um número sem significado.

Um detalhe de leitura: alfa baixo não quer dizer que o portal é ruim. Quer dizer que os itens daquela dimensão não estão medindo um construto único, e nesse caso o problema está na redação do item, não na ferramenta avaliada.

## Editando o instrumento

Tudo em `api/avaliacao.json`. Para acrescentar um item, some um objeto ao vetor `itens` com `id`, `dim` e `texto`, usando uma sigla de dimensão já declarada em `dimensoes`. Marque `"reverso": true` se a frase estiver na direção negativa. A página, o cálculo e o relatório se ajustam sozinhos.

Ao mudar itens depois de já ter coletado respostas, altere também o `codigo` do instrumento, por exemplo para `validacao_portal_v2`. O resumo filtra por esse código, então as duas versões não se misturam na análise.
