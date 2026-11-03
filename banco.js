const URL_SUPABASE = "https://xcucfcyexsisthbpkvqv.supabase.co";

const CHAVE_PUBLICA_SUPABASE =
  "sb_publishable_7PW0-vcmlGHISnjc22Tx1w_qD4Pj24w";

const bancoAcessa = window.supabase.createClient(
  URL_SUPABASE,
  CHAVE_PUBLICA_SUPABASE
);

let ultimaConsultaAvaliacoes = 0;

function textoResultado(texto, elementoPai) {
  const p = document.createElement("p");
  p.textContent = texto;
  elementoPai.appendChild(p);
}

function montarResumoComunidade(linhas) {
  const container = document.getElementById(
    "resultados-comunidade"
  );

  container.replaceChildren();

  if (!linhas.length) {
    textoResultado(
      "Este estabelecimento ainda não tem avaliações. " +
      "Você pode enviar a primeira!",
      container
    );
    return;
  }

  DADOS.perfis.forEach(perfil => {
    const avaliacoes = linhas.filter(
      linha => linha.perfil === perfil.id
    );

    const cartao = document.createElement("article");
    cartao.className = "resumo-comunidade";

    const titulo = document.createElement("h4");
    titulo.textContent = perfil.nome;

    cartao.appendChild(titulo);

    if (!avaliacoes.length) {
      textoResultado("Sem avaliações nesta área.", cartao);
      container.appendChild(cartao);
      return;
    }

    const perguntas = DADOS.perguntas.filter(
      pergunta => pergunta.perfil === perfil.id
    );

    const notas = [];

    const detalhes = document.createElement("details");
    const summary = document.createElement("summary");

    summary.textContent = "Ver resultado por pergunta";

    detalhes.appendChild(summary);

    const lista = document.createElement("ul");

    perguntas.forEach(pergunta => {
      let soma = 0;
      let pesos = 0;
      let quantidade = 0;

      avaliacoes.forEach(avaliacao => {
        const resposta =
          avaliacao.respostas?.[pergunta.id];

        const opcao = DADOS.tiposResposta[
          pergunta.tipo
        ].find(item => item.rotulo === resposta);

        if (!opcao || opcao.valor === null) return;

        const peso = Number(avaliacao.peso);

        if (peso !== 1 && peso !== 2) return;

        soma += opcao.valor * peso;
        pesos += peso;
        quantidade += 1;
      });

      const item = document.createElement("li");

      if (pesos > 0) {
        const nota = soma / pesos;

        notas.push(nota);

        item.textContent =
          pergunta.texto + " — " +
          Math.round(nota * 100) +
          "% de atendimento ao critério; " +
          quantidade + " resposta(s) válida(s).";
      } else {
        item.textContent =
          pergunta.texto + " — sem respostas válidas.";
      }

      lista.appendChild(item);
    });

    textoResultado(
      avaliacoes.length + " avaliação(ões) enviada(s).",
      cartao
    );

    if (notas.length) {
      const media =
        notas.reduce((soma, nota) => soma + nota, 0) /
        notas.length;

      textoResultado(
        "Índice experimental: " +
        Math.round(media * 100) + "%. " +
        "Com base em " + notas.length +
        " de " + perguntas.length + " critérios.",
        cartao
      );
    } else {
      textoResultado(
        "Ainda não há respostas suficientes para calcular o índice.",
        cartao
      );
    }

    if (avaliacoes.length < 3) {
      textoResultado(
        "Poucas avaliações: interprete o resultado com cautela.",
        cartao
      );
    }

    let somaPesos = 0;
    let pesosSim = 0;

    avaliacoes.forEach(avaliacao => {
      const peso = Number(avaliacao.peso);

      somaPesos += peso;

      if (avaliacao.voltaria === "Sim") {
        pesosSim += peso;
      }
    });

    if (somaPesos > 0) {
      textoResultado(
        "Voltariam ao local: " +
        Math.round((pesosSim / somaPesos) * 100) +
        "% das respostas ponderadas marcaram “Sim”.",
        cartao
      );
    }

    const datas = avaliacoes
      .map(item => Date.parse(item.criado_em))
      .filter(data => Number.isFinite(data));

    if (datas.length) {
      const ultima = new Date(Math.max(...datas));

      textoResultado(
        "Última avaliação: " +
        ultima.toLocaleString("pt-BR"),
        cartao
      );
    }

    detalhes.appendChild(lista);
    cartao.appendChild(detalhes);
    container.appendChild(cartao);
  });
}

window.carregarAvaliacoesLocal = async function () {
  const local = window.localSelecionadoAcessa;

  if (!local) return;

  const placeId = local.placeId;
  const consultaId = ++ultimaConsultaAvaliacoes;

  const container = document.getElementById(
    "resultados-comunidade"
  );

  container.textContent = "Carregando avaliações...";

  try {
    const { data, error } = await bancoAcessa
      .from("avaliacoes")
      .select(
        "perfil,respostas,peso,voltaria,criado_em"
      )
      .eq("place_id", placeId)
      .order("criado_em", { ascending: false })
      .limit(500);

    if (error) throw error;

    // Evita exibir resultados de uma seleção anterior.
    if (
      consultaId !== ultimaConsultaAvaliacoes ||
      window.localSelecionadoAcessa?.placeId !== placeId
    ) {
      return;
    }

    montarResumoComunidade(data || []);
  } catch (erro) {
    console.error("Erro ao consultar avaliações:", erro);

    if (consultaId === ultimaConsultaAvaliacoes) {
      container.textContent =
        "Não foi possível carregar as avaliações. " +
        "Tente atualizar.";
    }
  }
};

document.getElementById(
  "btn-atualizar-avaliacoes"
).addEventListener("click", () => {
  window.carregarAvaliacoesLocal();
});