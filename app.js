const recipeInput = document.querySelector("#recipe-input");
const planButton = document.querySelector("#plan-button");
const resetButton = document.querySelector("#reset-button");
const results = document.querySelector("#results");
const mealPlan = document.querySelector("#meal-plan");
const shoppingList = document.querySelector("#shopping-list");
const askForm = document.querySelector("#ask-form");
const askInput = document.querySelector("#ask-input");
const chatLog = document.querySelector("#chat-log");
const decisionSummary = document.querySelector("#decision-summary");

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const fallbackRecipes = [
  { name: "Handvo", ingredients: ["rice", "lentils", "yogurt", "carrot"], image: "/recipes/Handvo.jpeg" },
  { name: "Margherita chicken pasta", ingredients: ["chicken", "pasta", "tomatoes", "mozzarella"], image: "/recipes/Margherita Chiken paasta.jpeg" },
  { name: "Mini Ghevar", ingredients: ["flour", "sugar", "ghee", "milk"], image: "/recipes/MiniGhevar.jpeg" },
  { name: "Rabdi", ingredients: ["milk", "sugar", "cardamom", "pistachios"], image: "/recipes/Rabdi.jpeg" },
  { name: "Tacos", ingredients: ["tortillas", "beans", "cabbage", "lime"], image: "/recipes/Taco.jpeg" },
  { name: "Stuffed garlic bread", ingredients: ["bread", "garlic", "butter", "cheese"], image: "/recipes/WheatstuffedGarlicBread.jpeg" },
];

let activeRecipes = fallbackRecipes;

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
  activeRecipes = recipes;
  mealPlan.innerHTML = days.map((day, index) => {
    const recipe = recipes[index % recipes.length];
    return `<article class="meal-card"><img src="${recipe.image}" alt="${recipe.name}" /><div class="meal-card-content"><small>${day}</small><h3>${recipe.name}</h3></div></article>`;
  }).join("");

  const ingredients = [...new Set(recipes.flatMap((recipe) => recipe.ingredients.map((item) => item.toLowerCase())))];
  shoppingList.innerHTML = ingredients.map((item) => `<li>${item}</li>`).join("");
  decisionSummary.textContent = `I chose ${recipes.length} recipes and repeated them strategically so your week has variety without creating a huge shopping trip.`;
  results.hidden = false;
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

planButton.addEventListener("click", () => renderPlan(parseRecipes()));
resetButton.addEventListener("click", () => { results.hidden = true; recipeInput.focus(); });

function addMessage(type, message) {
  const paragraph = document.createElement("p");
  paragraph.className = type === "user" ? "user-message" : "assistant-message";
  paragraph.textContent = message;
  chatLog.appendChild(paragraph);
  paragraph.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

askForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const question = askInput.value.trim();
  if (!question) return;
  addMessage("user", question);
  const normalizedQuestion = question.toLowerCase();
  let response = "I’d keep the plan as-is while protecting variety and ingredient reuse.";

  if (normalizedQuestion.includes("vegetarian") || normalizedQuestion.includes("veggie")) {
    const vegetarianRecipes = activeRecipes.filter((recipe) => !/chicken|beef|pork|fish|shrimp|meat/i.test(recipe.name));
    renderPlan(vegetarianRecipes.length ? vegetarianRecipes : fallbackRecipes.filter((recipe) => recipe.name !== "Margherita chicken pasta"));
    decisionSummary.textContent = "I removed the meat-based option and rebuilt the week around vegetarian recipes.";
    response = "Done — I rebuilt the plan around vegetarian recipes and refreshed the shopping list.";
  } else if (normalizedQuestion.includes("swap") || normalizedQuestion.includes("change")) {
    const rotatedRecipes = [...activeRecipes.slice(1), activeRecipes[0]];
    renderPlan(rotatedRecipes);
    response = "Done — I swapped the meal order while keeping the ingredient list compact.";
  } else if (normalizedQuestion.includes("shop") || normalizedQuestion.includes("buy") || normalizedQuestion.includes("ingredient")) {
    response = "Your shopping list is grouped below the meal plan. I combined repeated ingredients so you can make one efficient trip.";
  } else if (normalizedQuestion.includes("why") || normalizedQuestion.includes("decide")) {
    response = "I prioritized variety first, then reused ingredients across meals to reduce waste and keep prep manageable.";
  }

  addMessage("assistant", response);
  askInput.value = "";
});
