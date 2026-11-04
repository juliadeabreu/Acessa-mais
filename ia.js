(() => {
const form = document.getElementById("form-assistente");
const campo = document.getElementById("pergunta-assistente");
const botao = document.getElementById("btn-assistente");
const status = document.getElementById("status-assistente");
const resposta = document.getElementById("resposta-assistente");
const fontes = document.getElementById("fontes-assistente");
const detalhes = document.getElementById("detalhes-fontes-assistente");
let versao = 0;
let controlador;
window.addEventListener("acessa:local-alterado", () => {
  versao++;
  controlador?.abort();
  form.reset();
  status.textContent = "";
  resposta.textContent = "";
  fontes.replaceChildren();
  detalhes.hidden = true;
  botao.disabled = false;
  botao.textContent = "Perguntar ao assistente";
});
form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const placeId = window.localSelecionadoAcessa?.placeId;
  const question = campo.value.trim();
  if (!placeId) { status.textContent = "Selecione um local primeiro."; return; }
  if (!question || botao.disabled) return;
  const consulta = ++versao;
  controlador = new AbortController();
  const signal = controlador.signal;
  botao.disabled = true;
  botao.textContent = "Consultando...";
  status.textContent = "Analisando avaliações...";
  resposta.textContent = "";
  fontes.replaceChildren();
  detalhes.hidden = true;
  try {
    const { data, error } = await bancoAcessa.auth.getSession();
    if (error) throw error;
    if (consulta !== versao) return;
    const headers = { "Content-Type": "application/json", apikey: CHAVE_PUBLICA_SUPABASE };
    if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;
    const http = await fetch(`${URL_SUPABASE}/functions/v1/ask-accessibility`, {
      method: "POST", headers, body: JSON.stringify({ placeId, question }), signal,
    });
    const dados = await http.json().catch(() => ({}));
    if (consulta !== versao || window.localSelecionadoAcessa?.placeId !== placeId) return;
    if (!http.ok) {
      if ([401,403].includes(http.status)) throw new Error(`A função bloqueou o acesso (${http.status}). É necessário revisar a autenticação da Edge Function.`);
      throw new Error(dados.error || "Não foi possível consultar o assistente.");
    }
    if (typeof dados.resposta !== "string") throw new Error("Resposta inválida da função.");
    resposta.textContent = dados.resposta;
    status.textContent = `Avaliações consultadas: ${dados.totalAvaliacoesConsultadas ?? 0}.`;
    for (const fonte of (Array.isArray(dados.fontes) ? dados.fontes : [])) {
      const item = document.createElement("li");
      const data = new Date(fonte.criadoEm);
      const quando = Number.isNaN(data.getTime()) ? "Data não informada" : data.toLocaleString("pt-BR");
      item.textContent = `[${fonte.referencia}] — ${fonte.perfil} — ${quando} — ID: ${fonte.avaliacaoId}`;
      fontes.appendChild(item);
    }
    detalhes.hidden = !fontes.children.length;
  } catch (erro) {
    if (consulta === versao && erro.name !== "AbortError") status.textContent = erro.message || "Erro de conexão.";
  } finally {
    if (consulta === versao) {
      botao.disabled = false;
      botao.textContent = "Perguntar ao assistente";
    }
  }
});
})();
