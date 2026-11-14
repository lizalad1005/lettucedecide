const recipeInput = document.querySelector("#recipe-input");
const planButton = document.querySelector("#plan-button");
const resetButton = document.querySelector("#reset-button");
const results = document.querySelector("#results");
const mealPlan = document.querySelector("#meal-plan");
const shoppingList = document.querySelector("#shopping-list");
const askForm = document.querySelector("#ask-form");
const askInput = document.querySelector("#ask-input");
const chatLog = document.querySelector("#chat-log");

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const fallbackRecipes = [
  { name: "Handvo", ingredients: ["rice", "lentils", "yogurt", "carrot"], image: "/recipes/Handvo.jpeg" },
  { name: "Margherita chicken pasta", ingredients: ["chicken", "pasta", "tomatoes", "mozzarella"], image: "/recipes/Margherita Chiken paasta.jpeg" },
  { name: "Mini Ghevar", ingredients: ["flour", "sugar", "ghee", "milk"], image: "/recipes/MiniGhevar.jpeg" },
  { name: "Rabdi", ingredients: ["milk", "sugar", "cardamom", "pistachios"], image: "/recipes/Rabdi.jpeg" },
  { name: "Tacos", ingredients: ["tortillas", "beans", "cabbage", "lime"], image: "/recipes/Taco.jpeg" },
  { name: "Stuffed garlic bread", ingredients: ["bread", "garlic", "butter", "cheese"], image: "/recipes/WheatstuffedGarlicBread.jpeg" },
];

recipeInput.value = fallbackRecipes.map((recipe) => `${recipe.name} — ${recipe.ingredients.join(", ")}`).join("\n");

function parseRecipes() {
  const lines = recipeInput.value.split("\n").map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return fallbackRecipes;
  return lines.map((line, index) => {
    const [namePart, ingredientsPart = "seasonal vegetables"] = line.split("—");
    return {
      name: namePart.trim() || `Recipe ${index + 1}`,
      ingredients: ingredientsPart.split(",").map((item) => item.trim()).filter(Boolean),
      image: fallbackRecipes[index % fallbackRecipes.length].image,
    };
  });
}

function renderPlan(recipes) {
  mealPlan.innerHTML = days.map((day, index) => {
    const recipe = recipes[index % recipes.length];
    return `<article class="meal-card"><img src="${recipe.image}" alt="${recipe.name}" /><div class="meal-card-content"><small>${day}</small><h3>${recipe.name}</h3></div></article>`;
  }).join("");

  const ingredients = [...new Set(recipes.flatMap((recipe) => recipe.ingredients.map((item) => item.toLowerCase())))];
  shoppingList.innerHTML = ingredients.map((item) => `<li>${item}</li>`).join("");
  results.hidden = false;
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

planButton.addEventListener("click", () => renderPlan(parseRecipes()));
resetButton.addEventListener("click", () => { results.hidden = true; recipeInput.focus(); });
askForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const question = askInput.value.trim();
  if (!question) return;
  chatLog.insertAdjacentHTML("beforeend", `<p class="user-message">${question}</p><p class="assistant-message">I’d make that adjustment while keeping the shopping list compact. This is where the Drex decision layer will connect.</p>`);
  askInput.value = "";
});
