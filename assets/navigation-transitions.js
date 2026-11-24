(() => {
  const home = new URL("./", document.baseURI);
  const homeFile = new URL("index.html", home).pathname;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  function destinationFromHome(activation) {
    if (!activation?.from || !activation.entry || activation.navigationType === "traverse") return null;

    const from = new URL(activation.from.url);
    const to = new URL(activation.entry.url);
    const homePaths = [home.pathname, homeFile];
    return from.origin === home.origin && homePaths.includes(from.pathname)
      && to.origin === home.origin && !homePaths.includes(to.pathname) ? to : null;
  }

  function prepareTransition(transition, photo) {
    // Skipping the transition also rejects ready, while navigation still completes.
    transition.ready.catch(() => {});
    if (!photo || reducedMotion.matches) {
      transition.skipTransition();
      return;
    }

    photo.style.viewTransitionName = "section-photo";
    const reset = () => photo.style.removeProperty("view-transition-name");
    transition.finished.then(reset, reset);
  }

  window.addEventListener("pageswap", ({ activation, viewTransition }) => {
    if (!viewTransition) return;

    const destination = destinationFromHome(activation);
    const photo = destination && [...document.querySelectorAll("img[data-transition-to]")].find(image => {
      const target = new URL(image.dataset.transitionTo, home);
      return target.pathname === destination.pathname && (!target.hash || target.hash === destination.hash);
    });
    prepareTransition(viewTransition, photo?.naturalWidth ? photo : null);
  });

  window.addEventListener("pagereveal", ({ viewTransition }) => {
    if (!viewTransition) return;

    const destination = destinationFromHome(window.navigation?.activation);
    const photo = destination && document.querySelector("img[data-transition-target]");
    prepareTransition(viewTransition, photo);
  });
})();
