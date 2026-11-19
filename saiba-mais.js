document.documentElement.classList.add("js");

const itens = document.querySelectorAll(".revelar");

if ("IntersectionObserver" in window) {
  const observador = new IntersectionObserver(
    (entradas, obs) => {
      entradas.forEach(entrada => {
        if (entrada.isIntersecting) {
          entrada.target.classList.add("visivel");
          obs.unobserve(entrada.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  itens.forEach(item => observador.observe(item));
} else {
  itens.forEach(item => item.classList.add("visivel"));
}