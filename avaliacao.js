const campoPerfilAvaliacao =
  document.getElementById("perfil-avaliacao");

const formularioAvaliacao =
  document.getElementById("form-avaliacao");

const containerPerguntas =
  document.getElementById("perguntas-avaliacao");

const mensagemAvaliacao =
  document.getElementById("mensagem-avaliacao");

let enviandoAvaliacao = false;


// Lê os perfis declarados no cadastro.
function lerPerfisAvaliador() {
  try {
    const perfis = JSON.parse(
      localStorage.getItem("acessaMais.perfis")
    );

    return Array.isArray(perfis) ? perfis : [];
  } catch {
    return [];
  }
}


// Limpa o formulário ao selecionar outro estabelecimento.
window.prepararFormularioAvaliacao = function () {
  formularioAvaliacao.reset();

  campoPerfilAvaliacao.value = "";

  containerPerguntas.replaceChildren();

  formularioAvaliacao.hidden = true;

  mensagemAvaliacao.textContent = "";
};


// Cria as perguntas com opções lado a lado.
function montarPerguntasAvaliacao() {
  formularioAvaliacao.reset();

  formularioAvaliacao.hidden = true;

  containerPerguntas.replaceChildren();

  mensagemAvaliacao.textContent = "";

  const perfilId = campoPerfilAvaliacao.value;

  if (!perfilId) {
    return;
  }

  if (
    typeof DADOS === "undefined" ||
    !DADOS ||
    !Array.isArray(DADOS.perguntas)
  ) {
    mensagemAvaliacao.textContent =
      "Não foi possível acessar as perguntas. " +
      "Atualize a página e tente novamente.";

    return;
  }

  const perfil = DADOS.perfis.find(
    item => item.id === perfilId
  );

  const perguntas = DADOS.perguntas.filter(
    pergunta => pergunta.perfil === perfilId
  );

  if (!perfil || perguntas.length === 0) {
    mensagemAvaliacao.textContent =
      "Nenhuma pergunta encontrada para esta área. " +
      "Confira o arquivo perguntas.json.";

    console.error(
      "Perfil sem perguntas:",
      perfilId
    );

    return;
  }

  document.getElementById(
    "titulo-perguntas-avaliacao"
  ).textContent = "Avaliação: " + perfil.nome;

  for (const [indice, pergunta] of perguntas.entries()) {
    const opcoes =
      DADOS.tiposResposta[pergunta.tipo];

    if (!Array.isArray(opcoes) || opcoes.length === 0) {
      mensagemAvaliacao.textContent =
        "Há uma pergunta sem opções de resposta. " +
        "Confira o arquivo perguntas.json.";

      console.error(
        "Opções inválidas para a pergunta:",
        pergunta
      );

      containerPerguntas.replaceChildren();

      return;
    }

    const bloco = document.createElement("fieldset");

    bloco.className = "pergunta-opcoes";

    const legenda = document.createElement("legend");

    legenda.textContent =
      (indice + 1) + ". " + pergunta.texto;

    const linha = document.createElement("div");

    linha.className = "linha-opcoes";

    opcoes.forEach((opcao, indiceOpcao) => {
      const label = document.createElement("label");

      label.className = "opcao-resposta";

      const input = document.createElement("input");

      input.type = "radio";

      input.name = pergunta.id;

      input.id =
        "resposta-" + pergunta.id + "-" + indiceOpcao;

      input.value = opcao.rotulo;

      input.required = true;

      const texto = document.createElement("span");

      texto.textContent = opcao.rotulo;

      label.append(input, texto);

      linha.appendChild(label);
    });

    bloco.append(legenda, linha);

    containerPerguntas.appendChild(bloco);
  }

  document.getElementById(
    "info-autoria-avaliacao"
  ).textContent =
    "Seu nome e sua idade não serão enviados com esta avaliação.";

  formularioAvaliacao.hidden = false;
}


// Envia a avaliação para o banco compartilhado.
async function salvarAvaliacao(evento) {
  evento.preventDefault();

  if (enviandoAvaliacao) {
    return;
  }

  const local = window.localSelecionadoAcessa;

  const perfilId = campoPerfilAvaliacao.value;

  if (
    !local ||
    !local.placeId ||
    !perfilId ||
    typeof DADOS === "undefined" ||
    !DADOS
  ) {
    mensagemAvaliacao.textContent =
      "Selecione um estabelecimento e uma área de avaliação.";

    return;
  }

  if (typeof bancoAcessa === "undefined") {
    mensagemAvaliacao.textContent =
      "A conexão com o banco não está disponível. " +
      "Confira o arquivo banco.js.";

    return;
  }

  const perguntas = DADOS.perguntas.filter(
    pergunta => pergunta.perfil === perfilId
  );

  if (perguntas.length === 0) {
    mensagemAvaliacao.textContent =
      "Não foram encontradas perguntas para esta área.";

    return;
  }

  if (!formularioAvaliacao.reportValidity()) {
    return;
  }

  const respostas = {};

  perguntas.forEach(pergunta => {
    const marcada = formularioAvaliacao.querySelector(
      'input[name="' + pergunta.id + '"]:checked'
    );

    respostas[pergunta.id] = marcada?.value || "";
  });

  const todasRespondidas = perguntas.every(
    pergunta => respostas[pergunta.id] !== ""
  );

  if (!todasRespondidas) {
    mensagemAvaliacao.textContent =
      "Responda a todas as perguntas. " +
      "Se não souber, escolha “Não sei”.";

    return;
  }

  const temRespostaValida = perguntas.some(pergunta => {
    const opcoes =
      DADOS.tiposResposta[pergunta.tipo] || [];

    const opcao = opcoes.find(
      item => item.rotulo === respostas[pergunta.id]
    );

    return opcao && opcao.valor !== null;
  });

  if (!temRespostaValida) {
    mensagemAvaliacao.textContent =
      "É necessária pelo menos uma observação diferente " +
      "de “Não sei” ou “Não se aplica”.";

    return;
  }

  const voltaria = formularioAvaliacao.querySelector(
    'input[name="voltaria"]:checked'
  );

  if (!voltaria) {
    mensagemAvaliacao.textContent =
      "Responda se você voltaria ao local.";

    return;
  }

  const perfis = lerPerfisAvaliador();

  const peso = perfis.includes(perfilId)
    ? DADOS.config.pesoPerfilCorrespondente
    : DADOS.config.pesoOutros;

  const registro = {
    place_id: local.placeId,
    perfil: perfilId,
    respostas,
    peso,
    voltaria: voltaria.value
  };

  const botao = formularioAvaliacao.querySelector(
    'button[type="submit"]'
  );

  enviandoAvaliacao = true;

  botao.disabled = true;

  botao.textContent = "Salvando...";

  mensagemAvaliacao.textContent =
    "Enviando avaliação...";

  try {
    const { error } = await bancoAcessa
      .from("avaliacoes")
      .insert(registro);

    if (error) {
      throw error;
    }
  } catch (erro) {
    console.error(
      "Erro ao enviar avaliação:",
      erro
    );

    mensagemAvaliacao.textContent =
      "Não foi possível enviar. Suas respostas " +
      "continuam preenchidas para tentar novamente.";

    return;
  } finally {
    enviandoAvaliacao = false;

    botao.disabled = false;

    botao.textContent = "Salvar avaliação";
  }

  // Não limpa um novo formulário caso o usuário
  // tenha trocado de local ou de área durante o envio.
  const mesmaSelecao =
    window.localSelecionadoAcessa?.placeId === local.placeId &&
    campoPerfilAvaliacao.value === perfilId;

  if (mesmaSelecao) {
    formularioAvaliacao.reset();

    campoPerfilAvaliacao.value = "";

    containerPerguntas.replaceChildren();

    formularioAvaliacao.hidden = true;

    mensagemAvaliacao.textContent =
      "Avaliação enviada para o banco compartilhado!";
  }

  if (
    typeof window.carregarAvaliacoesLocal === "function"
  ) {
    try {
      await window.carregarAvaliacoesLocal();
    } catch (erro) {
      console.error(
        "A avaliação foi enviada, mas o resumo não foi atualizado:",
        erro
      );

      if (mesmaSelecao) {
        mensagemAvaliacao.textContent =
          "Avaliação enviada! Clique em “Atualizar avaliações” " +
          "para atualizar o resumo.";
      }
    }
  }
}


// Conecta a escolha da área à criação das perguntas.
campoPerfilAvaliacao.addEventListener(
  "change",
  montarPerguntasAvaliacao
);


// Conecta o envio do formulário ao salvamento.
formularioAvaliacao.addEventListener(
  "submit",
  salvarAvaliacao
);