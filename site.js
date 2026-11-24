const copyStatus = document.querySelector("#copy-status");

if (navigator.clipboard && copyStatus) {
  for (const button of document.querySelectorAll("[data-copy]")) {
    button.hidden = false;
    button.addEventListener("click", async () => {
      copyStatus.textContent = "";
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        copyStatus.textContent = button.dataset.copy.includes("@")
          ? "Adresse e-mail copiée."
          : "Numéro de téléphone copié.";
      } catch {
        copyStatus.textContent = "Copie indisponible. Vous pouvez sélectionner le texte.";
      }
    });
  }
}
