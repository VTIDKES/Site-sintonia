# Checklist de deploy

Passo a passo do zero até os dados chegando no Mongo. Faça na ordem.

---

## 1. Subir para o GitHub

Todos os arquivos vão para a **raiz** do repositório, com as pastas `conteudo/` e `api/` junto:

```
index.html   aula.html   simulador.html
questionario.html   avaliacao.html   painel.html
config.js   animacoes.js   questionario.js   avaliacao.js   painel.js
estilo.css   render.yaml   .gitignore
conteudo/    (14 arquivos .md)
api/         (main.py, banco.json, avaliacao.json, requirements.txt, .env.exemplo)
```

Se estiver usando a interface do GitHub, arraste as **pastas inteiras**, não os arquivos soltos. O erro mais comum é a `conteudo/` não subir, e aí as aulas dão "Aula não encontrada".

---

## 2. MongoDB Atlas

Já feito, mas confirme:

- [ ] **Network Access** tem a entrada `0.0.0.0/0`, sem prazo de validade
- [ ] **Database Users** tem o usuário com permissão *Read and write to any database*
- [ ] A senha não contém `@`, `:`, `/` ou `#`

Não crie banco nem coleção. `portal_controle`, `respostas` e `avaliacoes` nascem sozinhos no primeiro envio.

---

## 3. Render: os dois serviços

**New → Blueprint** e conecte o repositório. O `render.yaml` cria os dois de uma vez:

| Serviço | Tipo | O que faz |
|---|---|---|
| `portal-sistemas-de-controle` | Static Site | O portal. Não hiberna |
| `portal-controle-api` | Web Service | A API. Hiberna após 15 min |

---

## 4. Variáveis de ambiente

No serviço **`portal-controle-api`**, aba **Environment**, preencha as duas que subiram vazias:

| Variável | Valor |
|---|---|
| `MONGODB_URI` | a string do Atlas, com a senha real |
| `CHAVE_PROFESSOR` | uma senha sua, só para ver os relatórios |

E **confira** estas duas, que já vieram preenchidas:

| Variável | Precisa bater com |
|---|---|
| `MONGODB_BANCO` | `portal_controle` |
| `ORIGENS` | a URL exata do Static Site, com `https://` e **sem barra no final** |

O `ORIGENS` é o CORS. Se estiver diferente por um caractere, o envio falha e o erro só aparece no console do navegador.

---

## 5. Apontar o portal para a API

O Render mostra a URL do Web Service assim que ele sobe. Abra **`config.js`**, ajuste a linha e dê push:

```js
window.PORTAL_API = 'https://SEU-SERVICO.onrender.com';
```

É o único lugar do projeto onde esse endereço aparece.

---

## 6. Testar, nesta ordem

**A API está de pé?**
Abra `https://SEU-SERVICO.onrender.com/saude` → espera-se `{"ok": true, ...}`
A primeira chamada demora perto de um minuto: é o cold start.

**Leu o banco de questões?**
`https://SEU-SERVICO.onrender.com/questionarios` → deve listar 12 aulas.

**O portal está inteiro?**
Abra `/aula.html?f=02_laplace` e role até a tabela de propriedades. A linha da **Integração** precisa aparecer como fórmula, não como texto vermelho. Depois `/aula.html?f=04_dinamica_ordem2`, onde o bloco da massa-mola deve estar oscilando.

**Grava no Mongo?**
Responda a avaliação inteira em `/avaliacao.html`. No fim, se aparecerem as barras por dimensão sem nenhum aviso vermelho, gravou. Confirme no Atlas em **Browse Collections**: o banco `portal_controle` com a coleção `avaliacoes`.

**O painel abre?**
`/painel.html`, digite a `CHAVE_PROFESSOR`. Deve mostrar a avaliação recém-enviada.

---

## Se der errado

| Sintoma | Causa provável |
|---|---|
| Aulas dão "não encontrada" | A pasta `conteudo/` não subiu, ou ficou dentro de outra pasta |
| Fórmulas em vermelho | O `aula.html` antigo ficou no repositório |
| Nada anima | O `animacoes.js` não subiu |
| Envio falha, console diz CORS | `ORIGENS` diferente da URL real do portal |
| `"gravado": false` no envio | Problema de banco: senha errada, ou falta o `0.0.0.0/0` |
| Painel diz "chave incorreta" | `CHAVE_PROFESSOR` não foi preenchida no Render |
| Primeira requisição demora 1 min | Normal. É a hibernação do plano gratuito |

O log do serviço, na aba **Logs** do Render, mostra o motivo real de qualquer falha de conexão com o Mongo.

---

## Antes de usar com a turma

- [ ] Abrir o portal uma vez uns minutos antes da aula, para acordar a API
- [ ] Testar em um celular, não só no computador
- [ ] Guardar a `CHAVE_PROFESSOR` em lugar seguro: é ela que dá acesso aos dados dos alunos
- [ ] Decidir se a avaliação fica aberta a qualquer visitante ou só à turma
