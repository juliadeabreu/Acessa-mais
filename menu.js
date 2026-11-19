(function () {
  const CHAVE_PERFIS = "acessaMais.perfis";
  const ESTA_NA_HOME = !!document.getElementById("tela-perfil");
  const PAGINA_ATUAL = location.pathname.split("/").pop() || "index.html";

  let nomesPerfis = {};

  fetch("perguntas.json")
    .then(resp => resp.json())
    .then(dados => {
      dados.perfis.forEach(perfil => {
        nomesPerfis[perfil.id] = perfil.nome;
      });
    })
    .catch(erro => console.error("Menu: não carregou perguntas.json", erro));

  function lerPerfisSalvos() {
    const bruto = localStorage.getItem(CHAVE_PERFIS);
    if (bruto === null) return null;
    try {
      const lista = JSON.parse(bruto);
      return Array.isArray(lista) ? lista : [];
    } catch {
      return [];
    }
  }

  // Botão do menu
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "btn-menu";
  botao.id = "btn-menu";
  botao.textContent = "☰ Menu";
  botao.setAttribute("aria-expanded", "false");
  botao.setAttribute("aria-controls", "menu-lateral");

  // Fundo escuro
  const fundo = document.createElement("div");
  fundo.className = "menu-fundo";

  // Painel
  const painel = document.createElement("nav");
  painel.className = "menu-lateral";
  painel.id = "menu-lateral";
  painel.setAttribute("aria-label", "Menu principal");

  const topo = document.createElement("div");
  topo.className = "menu-topo";

  const titulo = document.createElement("strong");
  titulo.textContent = "Acessa+";

  const fechar = document.createElement("button");
  fechar.type = "button";
  fechar.className = "menu-fechar";
  fechar.textContent = "✕";
  fechar.setAttribute("aria-label", "Fechar menu");

  topo.append(titulo, fechar);

  const lista = document.createElement("ul");

  function criarLink(texto, href, arquivo) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.className = "menu-link";
    link.href = href;
    link.textContent = texto;
    if (PAGINA_ATUAL === arquivo) link.setAttribute("aria-current", "page");
    item.appendChild(link);
    return item;
  }

  lista.append(
    criarLink("Início", "index.html", "index.html"),
    criarLink("Para saber mais", "saiba-mais.html", "saiba-mais.html")
  );

  const blocoPerfis = document.createElement("section");
  blocoPerfis.className = "menu-perfis";
  blocoPerfis.setAttribute("aria-labelledby", "titulo-menu-perfis");

  const rodape = document.createElement("p");
  rodape.className = "menu-rodape";
  rodape.textContent = "Protótipo acadêmico. Índice experimental.";

  painel.append(topo, lista, blocoPerfis, rodape);
  document.body.append(botao, fundo, painel);

  // Monta o bloco "Meus perfis" a cada abertura
  function montarBlocoPerfis() {
    blocoPerfis.replaceChildren();

    const h2 = document.createElement("h2");
    h2.id = "titulo-menu-perfis";
    h2.textContent = "Meus perfis";
    blocoPerfis.appendChild(h2);

    const salvos = lerPerfisSalvos();

    if (salvos === null) {
      const p = document.createElement("p");
      p.textContent = "Você ainda não escolheu seus perfis.";
      blocoPerfis.appendChild(p);
    } else if (salvos.length === 0) {
      const p = document.createElement("p");
      p.textContent = "Visitante, sem perfil definido.";
      blocoPerfis.appendChild(p);
    } else {
      const ul = document.createElement("ul");
      salvos.forEach(id => {
        const li = document.createElement("li");
        li.textContent = nomesPerfis[id] || id;
        ul.appendChild(li);
      });
      blocoPerfis.appendChild(ul);
    }

    const editar = document.createElement("button");
    editar.type = "button";
    editar.className = "menu-editar";
    editar.textContent = salvos === null ? "Escolher perfis" : "Editar perfis";
    editar.addEventListener("click", editarPerfis);
    blocoPerfis.appendChild(editar);
  }

  function editarPerfis() {
    fecharMenu(false);
    if (ESTA_NA_HOME) {
      const btnEditar = document.getElementById("btn-editar");
      if (btnEditar) btnEditar.click();
    } else {
      location.href = "index.html#editar-perfil";
    }
  }

  function abrirMenu() {
    montarBlocoPerfis();
    painel.classList.add("aberto");
    fundo.classList.add("aberto");
    botao.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    fechar.focus();
  }

  function fecharMenu(devolverFoco = true) {
    painel.classList.remove("aberto");
    fundo.classList.remove("aberto");
    botao.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (devolverFoco) botao.focus();
  }

  botao.addEventListener("click", () => {
    painel.classList.contains("aberto") ? fecharMenu() : abrirMenu();
  });
  fechar.addEventListener("click", () => fecharMenu());
  fundo.addEventListener("click", () => fecharMenu());
  document.addEventListener("keydown", evento => {
    if (evento.key === "Escape" && painel.classList.contains("aberto")) {
      fecharMenu();
    }
  });

  // Vindo da outra página: abre a tela de editar perfis
  if (ESTA_NA_HOME && location.hash === "#editar-perfil") {
    let tentativas = 0;
    const espera = setInterval(() => {
      tentativas++;
      const pronto = document.querySelector("#lista-perfis .card");
      const btnEditar = document.getElementById("btn-editar");
      if (pronto && btnEditar) {
        clearInterval(espera);
        btnEditar.click();
        history.replaceState(null, "", "index.html");
      } else if (tentativas > 30) {
        clearInterval(espera);
      }
    }, 150);
  }
})();