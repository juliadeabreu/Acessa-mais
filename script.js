let DADOS = null;
const CHAVE = "acessaMais.perfis";
const CHAVE_USUARIO = "acessaMais.usuario";

async function carregarDados() {
  const resp = await fetch("perguntas.json");
  if (!resp.ok) throw new Error("Não foi possível carregar perguntas.json");
  DADOS = await resp.json();
}

function perfisSalvos() {
  try { return JSON.parse(localStorage.getItem(CHAVE)) || []; }
  catch { return []; }
}

function renderPerfis() {
  const salvos = perfisSalvos();
  const jaEscolheu = localStorage.getItem(CHAVE) !== null;
  const nenhumMarcado = jaEscolheu && salvos.length === 0;

  const alvo = document.getElementById("lista-perfis");
  alvo.innerHTML = "";

  DADOS.perfis.forEach(p => {
    const label = document.createElement("label");
    label.className = "card";
    label.innerHTML = `
      <input type="checkbox" name="perfil" value="${p.id}" ${salvos.includes(p.id) ? "checked" : ""}>
      <strong>${p.nome}</strong>
      <span>${p.descricao}</span>
      <span class="marca">✔ Selecionado</span>`;
    alvo.appendChild(label);
  });

  const nenhum = document.createElement("label");
  nenhum.className = "card";
  nenhum.innerHTML = `
    <input type="checkbox" id="perfil-nenhum" name="perfil-nenhum" ${nenhumMarcado ? "checked" : ""}>
    <strong>Nenhuma dessas</strong>
    <span>Vou contribuir como visitante, sem representar uma dessas necessidades.</span>
    <span class="marca">✔ Selecionado</span>`;
  alvo.appendChild(nenhum);

  // "Nenhuma dessas" não pode ficar marcada junto com os outros perfis.
  alvo.onchange = evento => {
    const campo = evento.target;
    const caixaNenhum = document.getElementById("perfil-nenhum");

    if (campo.id === "perfil-nenhum" && campo.checked) {
      alvo.querySelectorAll('input[name="perfil"]').forEach(i => { i.checked = false; });
    } else if (campo.name === "perfil" && campo.checked) {
      caixaNenhum.checked = false;
    }

    document.getElementById("erro-perfil").textContent = "";
  };
}

function renderResumo() {
  const salvos = perfisSalvos();

  const nomes = DADOS.perfis
    .filter(perfil => salvos.includes(perfil.id))
    .map(perfil => perfil.nome);

  const texto = document.getElementById("texto-resumo");

  if (nomes.length > 0) {
    texto.textContent =
      "Seus perfis: " + nomes.join(", ") + ".";
  } else {
    texto.textContent =
      "Você pode avaliar os locais mesmo sem selecionar um perfil.";
  }
}

function mostrar(tela) {
  document.getElementById("tela-perfil").hidden =
    tela !== "perfil";

  document.getElementById("tela-resumo").hidden =
    tela !== "resumo";

  if (tela === "resumo") {
    requestAnimationFrame(() => {
      const status = document.getElementById("status-mapa");

      if (typeof window.iniciarMapaAcessa !== "function") {
        status.textContent =
          "O arquivo maps.js não foi carregado corretamente. " +
          "Confira o nome do arquivo e as tags de script.";

        console.error(
          "A função iniciarMapaAcessa não está disponível."
        );

        return;
      }

      window.iniciarMapaAcessa();
    });
  }
}

/* Cálculo (será usado na Etapa 4)
   avaliacoes: [{ perfisAvaliador: ["tea"], respostas: { T1: "Baixo", ... } }] */
function notaPergunta(pergunta, avaliacoes) {
  const opcoes = DADOS.tiposResposta[pergunta.tipo];
  let soma = 0, pesos = 0;
  avaliacoes.forEach(a => {
    const rotulo = a.respostas[pergunta.id];
    const op = opcoes.find(o => o.rotulo === rotulo);
    if (!op || op.valor === null) return;
    const w = a.perfisAvaliador.includes(pergunta.perfil)
      ? DADOS.config.pesoPerfilCorrespondente : DADOS.config.pesoOutros;
    soma += w * op.valor; pesos += w;
  });
  return pesos ? soma / pesos : null;
}

function notaPerfil(perfilId, avaliacoes) {
  const notas = DADOS.perguntas.filter(q => q.perfil === perfilId)
    .map(q => notaPergunta(q, avaliacoes)).filter(n => n !== null);
  if (!notas.length) return null;
  return (notas.reduce((a, b) => a + b, 0) / notas.length) * 100;
}

function faixa(nota) {
  return DADOS.config.faixas.find(f => nota >= f.min).rotulo;
}

async function iniciar() {
  try { await carregarDados(); }
  catch (e) {
    document.getElementById("conteudo").innerHTML =
      '<p class="erro">Erro ao carregar as perguntas. Abra o site com a extensão Live Server do VS Code.</p>';
    return;
  }
  renderPerfis();
  document.getElementById("btn-sem-perfil").addEventListener(
  "click",
  () => {
    // Desmarca qualquer perfil escolhido anteriormente.
    document.querySelectorAll(
      '#lista-perfis input[type="checkbox"]'
    ).forEach(campo => {
      campo.checked = false;
    });

    // Guarda uma lista vazia: nenhum perfil definido.
    localStorage.setItem(CHAVE, JSON.stringify([]));

    const usuario = {
      nome: document.getElementById("campo-nome").value.trim(),
      idade: document.getElementById("campo-idade").value,
      anonimo: document.getElementById("campo-anonimo").checked
    };

    localStorage.setItem(
      CHAVE_USUARIO,
      JSON.stringify(usuario)
    );

    renderResumo();
    mostrar("resumo");
  }
);
  document.getElementById("form-perfil").addEventListener("submit", e => {
    e.preventDefault();

    const marcados = [...document.querySelectorAll('input[name="perfil"]:checked')].map(i => i.value);
    const nenhum = document.getElementById("perfil-nenhum").checked;

    if (marcados.length === 0 && !nenhum) {
      document.getElementById("erro-perfil").textContent =
        "Escolha pelo menos uma opção para continuar.";
      return;
    }

    localStorage.setItem(CHAVE, JSON.stringify(marcados));

    const usuario = {
      nome: document.getElementById("campo-nome").value.trim(),
      idade: document.getElementById("campo-idade").value,
      anonimo: document.getElementById("campo-anonimo").checked
    };
    localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));

    renderResumo(); mostrar("resumo");
  });
  document.getElementById("btn-editar").addEventListener("click", () => {
    renderPerfis(); mostrar("perfil");
  });
  const usuarioSalvo = localStorage.getItem(CHAVE_USUARIO);
  if (usuarioSalvo) {
    const u = JSON.parse(usuarioSalvo);
    document.getElementById("campo-nome").value = u.nome || "";
    document.getElementById("campo-idade").value = u.idade || "";
    document.getElementById("campo-anonimo").checked = !!u.anonimo;
  }
  if (localStorage.getItem(CHAVE) !== null) { renderResumo(); mostrar("resumo"); }
}
iniciar();
