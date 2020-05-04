let menuToggle = function() {
  // eslint-disable-next-line no-undef
  let navMain = document.querySelector(".main-nav");
  // eslint-disable-next-line no-undef
  let navToggle = document.querySelector(".main-nav__toggle");

  if (!navMain || !navToggle) return;

  navToggle.addEventListener("click", function() {
    navMain.classList.toggle("main-nav--opened");
  });
};

menuToggle();
