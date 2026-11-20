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

    montarPainelAcessibilidade(data || []);
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
// ===== Painel de acessibilidade: índice geral + gráficos por tipo =====

const NS_SVG = "http://www.w3.org/2000/svg";

function elemento(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

function classeFaixa(indice) {
  if (indice >= 75) return "faixa-boa";
  if (indice >= 40) return "faixa-parcial";
  return "faixa-baixa";
}

function rotuloFaixa(indice) {
  return DADOS.config.faixas.find(f => indice >= f.min).rotulo;
}

// Gráfico em formato de rosca (SVG, sem biblioteca externa)
function criarRosca(indice, tamanho) {
  const raio = 48;
  const circunferencia = 2 * Math.PI * raio;

  const svg = document.createElementNS(NS_SVG, "svg");
  svg.setAttribute("viewBox", "0 0 120 120");
  svg.setAttribute("class", "rosca " + tamanho + " " + classeFaixa(indice));
  svg.setAttribute("aria-hidden", "true");

  const fundo = document.createElementNS(NS_SVG, "circle");
  fundo.setAttribute("class", "rosca-fundo");
  fundo.setAttribute("cx", "60");
  fundo.setAttribute("cy", "60");
  fundo.setAttribute("r", String(raio));

  const barra = document.createElementNS(NS_SVG, "circle");
  barra.setAttribute("class", "rosca-barra");
  barra.setAttribute("cx", "60");
  barra.setAttribute("cy", "60");
  barra.setAttribute("r", String(raio));
  barra.setAttribute(
    "stroke-dasharray",
    (circunferencia * indice / 100) + " " + circunferencia
  );
  barra.setAttribute("transform", "rotate(-90 60 60)");

  const texto = document.createElementNS(NS_SVG, "text");
  texto.setAttribute("class", "rosca-texto");
  texto.setAttribute("x", "60");
  texto.setAttribute("y", "60");
  texto.textContent = Math.round(indice) + "%";

  svg.append(fundo, barra, texto);
  return svg;
}

// Calcula o índice de um perfil com as regras de peso já existentes
function calcularPerfil(perfil, linhas) {
  const avaliacoes = linhas.filter(linha => linha.perfil === perfil.id);
  const perguntas = DADOS.perguntas.filter(p => p.perfil === perfil.id);

  const detalhes = perguntas.map(pergunta => {
    let soma = 0;
    let pesos = 0;
    let quantidade = 0;

    avaliacoes.forEach(avaliacao => {
      const resposta = avaliacao.respostas?.[pergunta.id];
      const opcao = DADOS.tiposResposta[pergunta.tipo]
        .find(item => item.rotulo === resposta);

      if (!opcao || opcao.valor === null) return;

      const peso = Number(avaliacao.peso);
      if (peso !== 1 && peso !== 2) return;

      soma += opcao.valor * peso;
      pesos += peso;
      quantidade += 1;
    });

    return {
      pergunta,
      nota: pesos > 0 ? soma / pesos : null,
      quantidade
    };
  });

  const validas = detalhes.filter(d => d.nota !== null);
  const indice = validas.length
    ? (validas.reduce((s, d) => s + d.nota, 0) / validas.length) * 100
    : null;

  return {
    perfil,
    avaliacoes,
    detalhes,
    indice,
    criteriosValidos: validas.length,
    totalCriterios: perguntas.length
  };
}

// Lista "ver resultado por pergunta" com barras
function criarListaPerguntas(detalhes) {
  const lista = elemento("ul", "lista-perguntas");

  detalhes.forEach(d => {
    const item = elemento("li", "item-pergunta");
    item.appendChild(elemento("span", "texto-pergunta", d.pergunta.texto));

    if (d.nota === null) {
      item.appendChild(elemento("span", "legenda-pergunta", "Sem respostas válidas."));
    } else {
      const pct = Math.round(d.nota * 100);

      const trilho = elemento("div", "barra-trilho");
      const preenchimento = elemento("div", "barra-preenchimento " + classeFaixa(pct));
      preenchimento.style.width = pct + "%";
      trilho.appendChild(preenchimento);

      item.append(
        trilho,
        elemento(
          "span",
          "legenda-pergunta",
          pct + "% de atendimento ao critério · " +
          d.quantidade + " resposta(s) válida(s)"
        )
      );
    }

    lista.appendChild(item);
  });

  return lista;
}

function montarPainelAcessibilidade(linhas) {
  const container = document.getElementById("resultados-comunidade");
  container.replaceChildren();

  if (!linhas.length) {
    container.appendChild(elemento(
      "p",
      "",
      "Este estabelecimento ainda não tem avaliações. Você pode enviar a primeira!"
    ));
    return;
  }

  const resultados = DADOS.perfis.map(perfil => calcularPerfil(perfil, linhas));
  const comIndice = resultados.filter(r => r.indice !== null);

  // ----- Índice geral -----
  const geral = elemento("section", "painel-geral");
  geral.setAttribute("aria-labelledby", "titulo-indice-geral");

  const tituloGeral = elemento("h4", "", "Índice geral de acessibilidade");
  tituloGeral.id = "titulo-indice-geral";
  geral.appendChild(tituloGeral);

  if (comIndice.length) {
    const indiceGeral =
      comIndice.reduce((s, r) => s + r.indice, 0) / comIndice.length;

    const corpo = elemento("div", "geral-corpo");
    corpo.appendChild(criarRosca(indiceGeral, "grande"));

    const textos = elemento("div", "geral-textos");
    textos.append(
      elemento(
        "p",
        "rotulo-faixa " + classeFaixa(indiceGeral),
        rotuloFaixa(indiceGeral) + ": " + Math.round(indiceGeral) + "%"
      ),
      elemento(
        "p",
        "",
        "Índice experimental, com base em " + linhas.length +
        " avaliação(ões) de " + comIndice.length +
        " tipo(s) de avaliação."
      )
    );

    if (linhas.length < 3) {
      textos.appendChild(elemento(
        "p",
        "aviso-cautela",
        "Poucas avaliações: interprete o resultado com cautela."
      ));
    }

    // Voltaria (não entra na nota)
    let somaPesos = 0;
    let pesosSim = 0;
    linhas.forEach(linha => {
      const peso = Number(linha.peso);
      if (peso !== 1 && peso !== 2) return;
      somaPesos += peso;
      if (linha.voltaria === "Sim") pesosSim += peso;
    });
    if (somaPesos > 0) {
      textos.appendChild(elemento(
        "p",
        "",
        "Voltariam ao local: " + Math.round((pesosSim / somaPesos) * 100) +
        "% das respostas ponderadas marcaram “Sim”."
      ));
    }

    const datas = linhas
      .map(l => Date.parse(l.criado_em))
      .filter(Number.isFinite);
    if (datas.length) {
      textos.appendChild(elemento(
        "p",
        "",
        "Última avaliação: " +
        new Date(Math.max(...datas)).toLocaleString("pt-BR")
      ));
    }

    corpo.appendChild(textos);
    geral.appendChild(corpo);

    const como = elemento("details", "detalhes-painel");
    como.append(
      elemento("summary", "", "Como o índice é calculado"),
      elemento(
        "p",
        "",
        "Cada resposta vale Sim = 1, Parcial = 0,5 e Não = 0. “Não sei” e " +
        "“Não se aplica” ficam fora do cálculo. Avaliações de quem tem o perfil " +
        "correspondente têm peso 2; as demais têm peso 1. O índice geral é a " +
        "média dos índices dos tipos de avaliação que já têm respostas. " +
        "“Você voltaria?” não entra na nota. Os resultados são relatos de " +
        "visitantes e não representam certificação técnica."
      )
    );
    geral.appendChild(como);
  } else {
    geral.appendChild(elemento(
      "p",
      "",
      "Ainda não há respostas suficientes para calcular o índice geral."
    ));
  }

  container.appendChild(geral);

  // ----- Gráficos pequenos, um por tipo de avaliação -----
  const tituloTipos = elemento("h4", "titulo-por-tipo", "Por tipo de avaliação");
  container.appendChild(tituloTipos);

  const grade = elemento("div", "grade-mini");

  resultados.forEach(r => {
    const cartao = elemento("article", "mini-grafico");
    cartao.appendChild(elemento("h5", "", r.perfil.nome));

    if (!r.avaliacoes.length) {
      cartao.appendChild(elemento(
        "p",
        "sem-avaliacoes",
        "Não há avaliações para essa condição."
      ));
      grade.appendChild(cartao);
      return;
    }

    if (r.indice === null) {
      cartao.appendChild(elemento(
        "p",
        "sem-avaliacoes",
        r.avaliacoes.length + " avaliação(ões), mas ainda sem respostas " +
        "suficientes para calcular o índice."
      ));
      grade.appendChild(cartao);
      return;
    }

    cartao.appendChild(criarRosca(r.indice, "pequena"));
    cartao.appendChild(elemento(
      "p",
      "rotulo-faixa " + classeFaixa(r.indice),
      rotuloFaixa(r.indice)
    ));
    cartao.appendChild(elemento(
      "p",
      "legenda-mini",
      r.avaliacoes.length + " avaliação(ões) · " +
      r.criteriosValidos + " de " + r.totalCriterios + " critérios"
    ));

    if (r.avaliacoes.length < 3) {
      cartao.appendChild(elemento(
        "p",
        "aviso-cautela",
        "Poucas avaliações: cautela."
      ));
    }

    const detalhes = elemento("details", "detalhes-painel");
    detalhes.append(
      elemento("summary", "", "Ver resultado por pergunta"),
      criarListaPerguntas(r.detalhes)
    );
    cartao.appendChild(detalhes);

    grade.appendChild(cartao);
  });

  container.appendChild(grade);
}

// Faz o site usar o painel novo no lugar do resumo antigo
montarResumoComunidade = montarPainelAcessibilidade;