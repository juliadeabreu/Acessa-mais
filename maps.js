const CHAVE_DEMO_GOOGLE = "AIzaSyCp5x6dWsYoZp8JlCWk2bo5fzbuSf0b6Hs";

let promessaCarregamentoGoogle = null;
let promessaInicializacaoMapa = null;

let mapaAcessa = null;
let marcadorAcessa = null;

let ClassePlace = null;

window.localSelecionadoAcessa = null;

// Carrega a biblioteca do Google uma única vez.
function carregarGoogleMaps() {
  if (window.google?.maps?.importLibrary) {
    return Promise.resolve();
  }

  if (promessaCarregamentoGoogle) {
    return promessaCarregamentoGoogle;
  }

  promessaCarregamentoGoogle = new Promise((resolve, reject) => {
    if (
      !CHAVE_DEMO_GOOGLE ||
      CHAVE_DEMO_GOOGLE === "COLE_SUA_CHAVE_DEMO_AQUI"
    ) {
      reject(
        new Error("Insira sua chave de demonstração no arquivo maps.js.")
      );
      return;
    }

    window.googleMapsDemoPronto = () => {
      resolve();
      delete window.googleMapsDemoPronto;
    };

    const parametros = new URLSearchParams({
      key: CHAVE_DEMO_GOOGLE,
      loading: "async",
      callback: "googleMapsDemoPronto",
      v: "weekly",
      language: "pt-BR",
      region: "BR"
    });

    const script = document.createElement("script");

    script.src =
      "https://maps.googleapis.com/maps/api/js?" + parametros;

    script.async = true;

    script.onerror = () => {
      reject(
        new Error("Não foi possível carregar a biblioteca do Google Maps.")
      );
    };

    document.head.appendChild(script);
  });

  return promessaCarregamentoGoogle;
}

// Limpa a seleção quando uma nova busca começa.
function limparSelecaoLocal() {
  window.localSelecionadoAcessa = null;
  window.dispatchEvent(new Event("acessa:local-alterado"));

  document.getElementById("local-selecionado").hidden = true;

  if (marcadorAcessa) {
    marcadorAcessa.map = null;
  }
}

// Atualiza o mapa e o cartão com o local escolhido.
function selecionarLocal(local) {
  if (!local.location) return;

  mapaAcessa.setCenter(local.location);
  mapaAcessa.setZoom(17);

  marcadorAcessa.position = local.location;
  marcadorAcessa.title = local.displayName || "Local selecionado";
  marcadorAcessa.map = mapaAcessa;

  window.localSelecionadoAcessa = {
    placeId: local.id,
    nome: local.displayName || "Local sem nome",
    endereco: local.formattedAddress || "",
    latitude: local.location.lat(),
    longitude: local.location.lng()
  };
  window.dispatchEvent(new Event("acessa:local-alterado"));

  document.getElementById("nome-local").textContent =
    window.localSelecionadoAcessa.nome;

  document.getElementById("endereco-local").textContent =
    window.localSelecionadoAcessa.endereco;

  document.getElementById("local-selecionado").hidden = false;

  // Esconde a lista de resultados após escolher um local.
  document.getElementById("secao-resultados").hidden = true;
  
  if (
  typeof window.prepararFormularioAvaliacao === "function"
) {
  window.prepararFormularioAvaliacao();
}
if (
  typeof window.carregarAvaliacoesLocal === "function"
) {
  window.carregarAvaliacoesLocal();
}

  document.getElementById("status-mapa").textContent =
    "Local selecionado: " + window.localSelecionadoAcessa.nome;
}

// Monta a lista de resultados sem inserir dados externos como HTML.
function mostrarResultados(locais) {
  const lista = document.getElementById("lista-resultados");

  lista.replaceChildren();

  locais.forEach((local) => {
    const item = document.createElement("li");
    item.className = "resultado-local";

    const nome = document.createElement("h4");
    nome.textContent = local.displayName || "Local sem nome";

    const endereco = document.createElement("p");
    endereco.textContent =
      local.formattedAddress || "Endereço não informado";

    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "botao";
    botao.textContent = "Selecionar este local";

    botao.setAttribute(
      "aria-label",
      "Selecionar " +
        (local.displayName || "este local") +
        ", " +
        (local.formattedAddress || "endereço não informado")
    );

    botao.addEventListener("click", () => {
      selecionarLocal(local);
    });

    item.append(nome, endereco, botao);
    lista.appendChild(item);
  });

  document.getElementById("secao-resultados").hidden = false;
}

// Executa a busca somente quando a pessoa envia o formulário.
async function buscarLocais(evento) {
  evento.preventDefault();

  const campo = document.getElementById("campo-busca-local");
  const botao = document.getElementById("btn-buscar-local");
  const status = document.getElementById("status-mapa");

  const texto = campo.value.trim();

  if (!texto) {
    status.textContent = "Digite o nome de um local e a cidade.";
    campo.focus();
    return;
  }

  botao.disabled = true;
  botao.textContent = "Buscando...";

  limparSelecaoLocal();

  document.getElementById("secao-resultados").hidden = true;
  document.getElementById("lista-resultados").replaceChildren();

  status.textContent = "Buscando estabelecimentos...";

  try {
    const resposta = await ClassePlace.searchByText({
      textQuery: texto,

      fields: [
        "id",
        "displayName",
        "formattedAddress",
        "location"
      ]
    });

    const locais = (resposta.places || [])
      .filter((local) => local.location)
      .slice(0, 5);

    if (locais.length === 0) {
      status.textContent =
        "Nenhum local encontrado. Tente informar também a cidade.";
      return;
    }

    mostrarResultados(locais);

    const limites = new google.maps.LatLngBounds();

    locais.forEach((local) => {
      limites.extend(local.location);
    });

    if (locais.length === 1) {
      mapaAcessa.setCenter(locais[0].location);
      mapaAcessa.setZoom(16);
    } else {
      mapaAcessa.fitBounds(limites);
    }

    status.textContent =
      locais.length +
      " resultado(s) exibido(s). Confira os endereços e selecione um local.";
  } catch (erro) {
    console.error("Erro na busca de locais:", erro);

    status.textContent =
      "Não foi possível realizar a busca. " +
      "Confira o Console do navegador para identificar o erro.";
  } finally {
    botao.disabled = false;
    botao.textContent = "Buscar";
  }
}

// Inicializa o mapa quando a tela fica visível.
async function montarMapa() {
  const status = document.getElementById("status-mapa");

  status.textContent = "Carregando o Google Maps...";

  await carregarGoogleMaps();

  const { Map } = await google.maps.importLibrary("maps");

  const { AdvancedMarkerElement } =
    await google.maps.importLibrary("marker");

  const { Place } = await google.maps.importLibrary("places");

  ClassePlace = Place;

  mapaAcessa = new Map(
    document.getElementById("area-mapa"),
    {
      center: {
        lat: -23.5505,
        lng: -46.6333
      },
      zoom: 12,
      mapId: "DEMO_MAP_ID",
      streetViewControl: false,
      mapTypeControl: false
    }
  );

  marcadorAcessa = new AdvancedMarkerElement();

  document
    .getElementById("form-busca-local")
    .addEventListener("submit", buscarLocais);

  document.getElementById("btn-buscar-local").disabled = false;

  status.textContent =
    "Mapa carregado. Digite um estabelecimento e clique em Buscar.";
}

window.iniciarMapaAcessa = function () {
  if (!promessaInicializacaoMapa) {
    promessaInicializacaoMapa = montarMapa().catch((erro) => {
      console.error("Erro ao iniciar o mapa:", erro);

      document.getElementById("status-mapa").textContent =
        "Não foi possível iniciar o mapa. " +
        "Confira a chave de demonstração, sua conexão e o Console do navegador.";
    });
  }

  return promessaInicializacaoMapa;
};