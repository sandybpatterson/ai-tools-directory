const catNav = document.getElementById("cat-nav");
const pageNav = document.getElementById("page-nav");
const sections = document.querySelectorAll(".category");

function updateNavOffset() {
  if (!pageNav || !catNav) return;
  const offset = pageNav.offsetHeight;
  catNav.style.top = offset + "px";
  sections.forEach(s => {
    s.style.scrollMarginTop = (offset + catNav.offsetHeight + 8) + "px";
  });
}
updateNavOffset();
window.addEventListener("resize", updateNavOffset);

sections.forEach((section) => {
  const title = section.querySelector("h2").textContent;
  const link = document.createElement("a");
  link.href = `#${section.id}`;
  link.textContent = title;
  catNav.appendChild(link);
});

document.querySelectorAll(".card").forEach((card) => {
  if (!card.href) return;
  const hostname = new URL(card.href).hostname;
  const icon = document.createElement("img");
  icon.className = "favicon";
  icon.alt = "";
  icon.src = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  const h3 = card.querySelector('h3');
  if (h3) h3.prepend(icon);
  else card.prepend(icon);
});

const navLinks = catNav.querySelectorAll("a");
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        navLinks.forEach((link) => {
          const isActive = link.getAttribute("href") === `#${entry.target.id}`;
          link.classList.toggle("active", isActive);
          if (isActive) {
            link.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
          }
        });
      }
    });
  },
  { rootMargin: "-30% 0px -60% 0px" }
);
sections.forEach((section) => observer.observe(section));

const searchInput = document.getElementById("search");

const noResults = document.createElement("p");
noResults.id = "no-results";
noResults.textContent = "No tools found — try a different search.";
noResults.style.cssText = "display:none; text-align:center; color:#5a5e6b; padding:64px 0; font-size:0.95rem;";
document.querySelector("main").appendChild(noResults);

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    searchInput.value = "";
    searchInput.dispatchEvent(new Event("input"));
    searchInput.blur();
  }
});

searchInput.addEventListener("input", () => {
  const terms = searchInput.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let totalVisible = 0;

  document.querySelectorAll(".category").forEach((section) => {
    let visibleCount = 0;
    const categoryText = section.querySelector("h2").textContent.toLowerCase();

    section.querySelectorAll(".card").forEach((card) => {
      const clone = card.cloneNode(true);
      clone.querySelectorAll('.price-badge').forEach(el => el.remove());
      const text = clone.textContent.toLowerCase();
      const matches = terms.length === 0 || terms.every(t => text.includes(t) || categoryText.includes(t));
      card.classList.toggle("hidden", !matches);
      if (matches) visibleCount++;
    });

    section.classList.toggle("hidden", visibleCount === 0);
    totalVisible += visibleCount;
  });

  noResults.style.display = (terms.length > 0 && totalVisible === 0) ? "block" : "none";
});

fetch('pricing.json')
  .then(r => r.json())
  .then(({ tools }) => {
    document.querySelectorAll('.card').forEach(card => {
      if (!card.href) return;
      const h3 = card.querySelector('h3');
      if (!h3) return;
      const name = Array.from(h3.childNodes)
        .filter(n => n.nodeType === Node.TEXT_NODE)
        .map(n => n.textContent.trim())
        .filter(Boolean)
        .join('');
      const info = tools[name];
      if (!info) return;
      const badge = document.createElement('span');
      badge.className = 'price-badge';
      badge.textContent = info.rating;
      badge.dataset.rating = info.rating;
      badge.title = info.notes;
      h3.appendChild(badge);
    });
  })
  .catch(() => {});
