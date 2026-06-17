const catNav = document.getElementById("cat-nav");
const sections = document.querySelectorAll(".category");

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
  card.prepend(icon);
});

const navLinks = catNav.querySelectorAll("a");
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        navLinks.forEach((link) => {
          link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
        });
      }
    });
  },
  { rootMargin: "-30% 0px -60% 0px" }
);
sections.forEach((section) => observer.observe(section));

const searchInput = document.getElementById("search");

searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim().toLowerCase();

  document.querySelectorAll(".category").forEach((section) => {
    let visibleCount = 0;

    section.querySelectorAll(".card").forEach((card) => {
      const text = card.textContent.toLowerCase();
      const matches = text.includes(query);
      card.classList.toggle("hidden", !matches);
      if (matches) visibleCount++;
    });

    section.classList.toggle("hidden", visibleCount === 0);
  });
});
