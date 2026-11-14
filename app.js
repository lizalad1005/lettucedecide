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
const fridgePhoto = document.querySelector("#fridge-photo");
const fridgePreview = document.querySelector("#fridge-preview");
const ingredientImages = document.querySelector("#ingredient-images");
const uploadLabel = document.querySelector("#upload-label");
const detectedItems = document.querySelector("#detected-items");
const recipeGallery = document.querySelector("#recipe-gallery");
const fridgeInput = document.querySelector("#fridge-input");
const saveFridgeButton = document.querySelector("#save-fridge");
const fridgeChecklist = document.querySelector("#fridge-checklist");
const analyzeIngredientsButton = document.querySelector("#analyze-ingredients");
const recipeCardPhoto = document.querySelector("#recipe-card-photo");
const recipeCardLabel = document.querySelector("#recipe-card-label");
const extractRecipeButton = document.querySelector("#extract-recipe");
const aiStatus = document.querySelector("#ai-status");
const recipeDetail = document.querySelector("#recipe-detail");
const recipeDetailContent = document.querySelector("#recipe-detail-content");
const closeRecipeDetail = document.querySelector("#close-recipe-detail");
const researchButton = document.querySelector("#research-button");

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const fallbackRecipes = [
  { name: "Handvo", ingredients: ["rice", "lentils", "yogurt", "carrot"], image: "./public/recipes/Handvo.jpeg" },
  { name: "Margherita chicken pasta", ingredients: ["chicken", "pasta", "tomatoes", "mozzarella"], image: "./public/recipes/Margherita Chiken paasta.jpeg" },
  { name: "Mini Ghevar", ingredients: ["flour", "sugar", "ghee", "milk"], image: "./public/recipes/MiniGhevar.jpeg" },
  { name: "Rabdi", ingredients: ["milk", "sugar", "cardamom", "pistachios"], image: "./public/recipes/Rabdi.jpeg" },
  { name: "Tacos", ingredients: ["tortillas", "beans", "cabbage", "lime"], image: "./public/recipes/Taco.jpeg" },
  { name: "Stuffed garlic bread", ingredients: ["bread", "garlic", "butter", "cheese"], image: "./public/recipes/WheatstuffedGarlicBread.jpeg" },
  { name: "Herbed stuffed garlic bread", ingredients: ["bread", "garlic", "butter", "mixed herbs"], image: "./public/recipes/WheatstuffedGarlicBread1.jpeg" },
  { name: "Cheesy wheat garlic bread", ingredients: ["wheat bread", "garlic", "butter", "cheese"], image: "./public/recipes/WheatstuffedGarlicBread2.jpeg" },
];

let activeRecipes = fallbackRecipes;
let recipeCatalog = fallbackRecipes;
let fridgeInventory = [];
let planningRound = 0;
let ingredientFiles = [];
let recipeCardFile = null;
let ingredientsAnalyzed = false;

const demoDetectedItems = ["milk", "garlic", "rice", "butter", "tomatoes"];

function renderDetectedItems(items = demoDetectedItems) {
  const cleanedItems = [...new Set(items.map((item) => item.trim().toLowerCase()).filter(Boolean))];
  detectedItems.innerHTML = cleanedItems.map((item) => `
    <label class="detected-item"><input type="checkbox" value="${item}" checked /> ${item}</label>
  `).join("");
  fridgeInventory = [...cleanedItems];
  detectedItems.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => {
      fridgeInventory = [...detectedItems.querySelectorAll("input:checked")].map((item) => item.value);
    });
  });
}

function renderFridgeChecklist() {
  const items = fridgeInput.value.split(/[\n,;]+/).map(ingredientName).filter(Boolean);
  fridgeInventory = [...new Set(items)];
  fridgeChecklist.innerHTML = fridgeInventory.map((item) => `<label class="detected-item"><input type="checkbox" value="${item}" checked /> ${item}</label>`).join("");
  fridgeChecklist.querySelectorAll("input").forEach((input) => input.addEventListener("change", () => {
    fridgeInventory = [...fridgeChecklist.querySelectorAll("input:checked")].map((item) => item.value);
  }));
}

saveFridgeButton.addEventListener("click", () => {
  renderFridgeChecklist();
  if (fridgeInventory.length) {
    ingredientsAnalyzed = true;
    planButton.disabled = false;
    planButton.textContent = "Plan my week";
  }
  aiStatus.textContent = `${fridgeInventory.length} fridge items saved for planning.`;
});

fridgePhoto.addEventListener("change", () => {
  ingredientFiles = [...fridgePhoto.files];
  if (!ingredientFiles.length) return;
  ingredientImages.innerHTML = ingredientFiles.map((file) => `<img src="${URL.createObjectURL(file)}" alt="Ingredient photo: ${file.name}" />`).join("");
  uploadLabel.textContent = `${ingredientFiles.length} ingredient photo${ingredientFiles.length === 1 ? "" : "s"} selected`;
  fridgePreview.hidden = false;
  ingredientsAnalyzed = false;
  analyzeIngredientsButton.disabled = false;
  planButton.disabled = true;
  planButton.textContent = "Analyze ingredients to continue";
});

recipeCardPhoto.addEventListener("change", () => {
  recipeCardFile = recipeCardPhoto.files[0] || null;
  if (!recipeCardFile) return;
  recipeCardLabel.textContent = recipeCardFile.name;
  extractRecipeButton.disabled = false;
});

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function callVision(path, files) {
  const images = await Promise.all(files.map(fileToDataUrl));
  const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ images }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "DeepInfra request failed");
  return result;
}

analyzeIngredientsButton.addEventListener("click", async () => {
  analyzeIngredientsButton.disabled = true;
  aiStatus.textContent = "DeepInfra vision is reading your ingredient photos…";
  try {
    const result = await callVision("/api/analyze-ingredients", ingredientFiles);
    renderDetectedItems(result.ingredients || []);
    ingredientsAnalyzed = true;
    planButton.disabled = false;
    planButton.textContent = "Plan my week";
    aiStatus.textContent = `DeepInfra vision identified ${result.ingredients?.length || 0} ingredients. Confirm or uncheck them below.`;
  } catch (error) {
    ingredientsAnalyzed = false;
    planButton.disabled = true;
    aiStatus.textContent = `Could not analyze the photos: ${error.message}. Set DEEPINFRA_API_KEY and run server.py.`;
  } finally {
    analyzeIngredientsButton.disabled = false;
  }
});

extractRecipeButton.addEventListener("click", async () => {
  if (!recipeCardFile) return;
  extractRecipeButton.disabled = true;
  aiStatus.textContent = "DeepInfra vision is reading the recipe card…";
  try {
    const extracted = await callVision("/api/extract-recipe", [recipeCardFile]);
    const recipe = {
      id: `scanned-${Date.now()}`,
      name: extracted.name || "Scanned recipe",
      image: URL.createObjectURL(recipeCardFile),
      ingredients: extracted.ingredients || [],
      steps: extracted.steps || [],
      diet: [],
      prepMinutes: 30,
      mealType: "dinner",
      servings: extracted.servings || "",
    };
    recipeCatalog.unshift(recipe);
    recipeInput.value = recipeCatalog.map((item) => `${item.name} — ${item.ingredients.join(", ")}`).join("\n");
    renderRecipeGallery(recipeCatalog);
    aiStatus.textContent = `${recipe.name} was extracted and added to your recipe cards.`;
  } catch (error) {
    aiStatus.textContent = `Could not read the recipe card: ${error.message}. Set DEEPINFRA_API_KEY and run server.py.`;
  } finally {
    extractRecipeButton.disabled = false;
  }
});

recipeInput.value = fallbackRecipes.map((recipe) => `${recipe.name} — ${recipe.ingredients.join(", ")}`).join("\n");
function renderRecipeGallery(recipes) {
  recipeGallery.innerHTML = recipes.map((recipe, index) => `
    <article class="recipe-photo-card" data-recipe-index="${index}" role="button" tabindex="0" aria-label="View ${recipe.name} recipe">
      ${recipe.image ? `<img src="${recipe.image}" alt="${recipe.name}" />` : `<div class="recipe-photo-placeholder">Photo<br />coming soon</div>`}
      <span>${recipe.name}</span>
    </article>
  `).join("");
}

function showRecipeDetails(recipe) {
  const ingredients = recipe.ingredients || [];
  const steps = recipe.steps || ["Recipe steps will be added soon. You can still use the ingredients to plan your shopping list."];
  recipeDetailContent.innerHTML = `
    <p class="eyebrow">Recipe card</p>
    <h2>${recipe.name}</h2>
    <div class="recipe-detail-grid">
      <div><h3>Ingredients</h3><ul>${ingredients.map((ingredient) => `<li>${ingredient}</li>`).join("")}</ul></div>
      <div><h3>How to make it</h3><ol>${steps.map((step) => `<li>${step}</li>`).join("")}</ol></div>
    </div>
  `;
  recipeDetail.hidden = false;
  recipeDetail.scrollIntoView({ behavior: "smooth", block: "center" });
}

function openRecipeByIndex(index) {
  const recipe = recipeCatalog[index];
  if (recipe) showRecipeDetails(recipe);
}

renderRecipeGallery(recipeCatalog);

fetch("./data/recipes.json")
  .then((response) => response.json())
  .then((recipes) => {
    recipeCatalog = recipes;
    recipeInput.value = recipes.map((recipe) => `${recipe.name} — ${recipe.ingredients.join(", ")}`).join("\n");
    renderRecipeGallery(recipeCatalog);
  })
  .catch(() => {
    // Opening index.html directly still works with the built-in demo recipes.
  });

function parseRecipes() {
  const lines = recipeInput.value.split("\n").map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return fallbackRecipes;
  return lines.map((line, index) => {
    const [namePart, ingredientsPart = "seasonal vegetables"] = line.split("—");
    const name = namePart.trim() || `Recipe ${index + 1}`;
    const catalogRecipe = recipeCatalog.find((recipe) => recipe.name.toLowerCase() === name.toLowerCase());
    return {
      ...(catalogRecipe || {}),
      name,
      ingredients: ingredientsPart.split(",").map((item) => item.trim()).filter(Boolean),
      image: catalogRecipe?.image || recipeCatalog[index % recipeCatalog.length].image,
    };
  });
}

function chooseWeeklyRecipes(recipes) {
  if (!recipes.length) return fallbackRecipes;
  const available = fridgeInventory.map(ingredientName);
  const rotation = planningRound % recipes.length;
  const ranked = recipes.map((recipe, index) => {
    const matches = recipe.ingredients.filter((ingredient) => {
      const name = ingredientName(ingredient);
      return available.some((item) => name === item || name.includes(item) || item.includes(name));
    }).length;
    const rotatedIndex = (index - rotation + recipes.length) % recipes.length;
    return { recipe, score: available.length ? matches * 100 - (recipe.prepMinutes || 30) : 0, rotatedIndex, matches };
  }).sort((a, b) => b.score - a.score || a.rotatedIndex - b.rotatedIndex);
  planningRound += 1;
  return ranked.slice(0, Math.min(7, ranked.length)).map((item) => item.recipe);
}

function ingredientName(ingredient) {
  return ingredient.replace(/\s*[-–—]\s*.*$/, "").trim().toLowerCase();
}

function renderPlan(recipes) {
  activeRecipes = recipes;
  mealPlan.innerHTML = days.map((day, index) => {
    const recipe = recipes[index % recipes.length];
    const image = recipe.image
      ? `<img src="${recipe.image}" alt="${recipe.name}" />`
      : `<div class="meal-photo-placeholder">Food photo<br />coming soon</div>`;
    const recipeIndex = recipeCatalog.findIndex((item) => item.id === recipe.id);
    const matches = recipe.ingredients.filter((ingredient) => fridgeInventory.some((item) => ingredientName(ingredient).includes(item) || item.includes(ingredientName(ingredient)))).length;
    const confidence = Math.min(98, 62 + matches * 12);
    return `<article class="meal-card" data-recipe-index="${recipeIndex >= 0 ? recipeIndex : index}" role="button" tabindex="0" aria-label="View ${recipe.name} recipe">${image}<div class="meal-card-content"><small>${day} · ${confidence}% fit</small><h3>${recipe.name}</h3></div></article>`;
  }).join("");

  const ingredients = [...new Set(recipes.flatMap((recipe) => recipe.ingredients.map(ingredientName)))];
  const neededIngredients = ingredients.filter((item) => !fridgeInventory.some((available) => item.includes(available) || available.includes(item)));
  const storeSection = (title, items) => items.length ? `<div class="store-section"><strong>${title}</strong><ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul></div>` : "";
  const produce = neededIngredients.filter((item) => /tomato|lettuce|cabbage|onion|carrot|spinach|banana|berries|mango|lemon|cucumber|pepper|vegetable|fruit|lime|coriander|mint/i.test(item));
  const dairy = neededIngredients.filter((item) => /milk|yogurt|cheese|butter|cream|ghee|mozzarella/i.test(item));
  const pantry = neededIngredients.filter((item) => !produce.includes(item) && !dairy.includes(item));
  shoppingList.innerHTML = neededIngredients.length ? `${storeSection("Produce", produce)}${storeSection("Dairy", dairy)}${storeSection("Pantry", pantry)}` : "<li>You already have everything needed.</li>";
  if (neededIngredients.length) sortShoppingListWithDrex(neededIngredients);
  const inventoryNote = fridgeInventory.length ? ` I left ${fridgeInventory.length} detected fridge items off the list.` : "";
  decisionSummary.textContent = `I ranked each recipe by how many ingredients you already have, then by prep time, rotating for variety. Drex sorts the shopping list into store sections.${inventoryNote}`;
  results.hidden = false;
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

const storeSectionOrder = ["Produce", "Dairy", "Meat & Fish", "Bakery", "Frozen", "Pantry"];
let shoppingSortRound = 0;

async function sortShoppingListWithDrex(items) {
  const round = ++shoppingSortRound;
  try {
    const response = await fetch("/api/store-sections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Drex request failed");
    if (round !== shoppingSortRound) return;
    const grouped = {};
    items.forEach((item) => {
      const decision = result.sections?.[item] || {};
      const section = storeSectionOrder.includes(decision.section) ? decision.section : "Pantry";
      (grouped[section] ||= []).push({ item, confidence: decision.confidence });
    });
    shoppingList.innerHTML = storeSectionOrder.filter((section) => grouped[section]).map((section) => `
      <div class="store-section"><strong>${section}</strong><ul>${grouped[section].map(({ item, confidence }) => `<li>${item}${typeof confidence === "number" ? ` <small class="muted">${Math.round(confidence * 100)}%</small>` : ""}</li>`).join("")}</ul></div>
    `).join("") + `<p class="muted">Store sections chosen by Drex (confidence shown per item).</p>`;
  } catch (error) {
    // Without NACE_API_KEY or server.py, keep the rule-based sections already shown.
  }
}

async function askDrexIntent(question) {
  try {
    const response = await fetch("/api/ask-intent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
    const result = await response.json();
    return response.ok ? result : null;
  } catch (error) {
    return null;
  }
}

function keywordIntent(normalizedQuestion) {
  if (normalizedQuestion.includes("vegetarian") || normalizedQuestion.includes("veggie")) return "vegetarian";
  if (normalizedQuestion.includes("swap") || normalizedQuestion.includes("change")) return "swap";
  if (normalizedQuestion.includes("shop") || normalizedQuestion.includes("buy") || normalizedQuestion.includes("ingredient")) return "shopping";
  if (normalizedQuestion.includes("why") || normalizedQuestion.includes("decide")) return "explain";
  return "other";
}

recipeGallery.addEventListener("click", (event) => {
  const card = event.target.closest("[data-recipe-index]");
  if (card) openRecipeByIndex(Number(card.dataset.recipeIndex));
});
recipeGallery.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  openRecipeByIndex(Number(event.target.dataset.recipeIndex));
});
mealPlan.addEventListener("click", (event) => {
  const card = event.target.closest("[data-recipe-index]");
  if (card) openRecipeByIndex(Number(card.dataset.recipeIndex));
});
closeRecipeDetail.addEventListener("click", () => { recipeDetail.hidden = true; });

planButton.addEventListener("click", () => {
  if (fridgeInput.value.trim()) renderFridgeChecklist();
  if (ingredientFiles.length && !ingredientsAnalyzed) {
    aiStatus.textContent = "Analyze your ingredient photos first, then plan your week.";
    aiStatus.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  renderPlan(chooseWeeklyRecipes(parseRecipes()));
});
resetButton.addEventListener("click", () => { results.hidden = true; recipeInput.focus(); });

function addMessage(type, message) {
  const paragraph = document.createElement("p");
  paragraph.className = type === "user" ? "user-message" : "assistant-message";
  paragraph.textContent = message;
  chatLog.appendChild(paragraph);
  paragraph.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

askForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const question = askInput.value.trim();
  if (!question) return;
  addMessage("user", question);
  askInput.value = "";
  const normalizedQuestion = question.toLowerCase();
  let response = "I’d keep the plan as-is while protecting variety and ingredient reuse.";
  const drexIntent = await askDrexIntent(question);
  const intent = drexIntent?.intent || keywordIntent(normalizedQuestion);
  const intentConfidence = drexIntent?.probabilities?.[intent];

  if (intent === "vegetarian") {
    const vegetarianRecipes = activeRecipes.filter((recipe) => !/chicken|beef|pork|fish|shrimp|meat/i.test(recipe.name));
    renderPlan(chooseWeeklyRecipes(vegetarianRecipes.length ? vegetarianRecipes : recipeCatalog.filter((recipe) => recipe.name !== "Margherita chicken pasta")));
    decisionSummary.textContent = "I removed the meat-based option and rebuilt the week around vegetarian recipes.";
    response = "Done — I rebuilt the plan around vegetarian recipes and refreshed the shopping list.";
  } else if (intent === "swap") {
    const rotatedRecipes = [...activeRecipes.slice(1), activeRecipes[0]];
    renderPlan(rotatedRecipes);
    response = "Done — I swapped the meal order while keeping the ingredient list compact.";
  } else if (intent === "shopping") {
    response = "Your shopping list is grouped below the meal plan. I combined repeated ingredients so you can make one efficient trip.";
  } else if (intent === "explain") {
    response = "I prioritized variety first, then reused ingredients across meals to reduce waste and keep prep manageable.";
  }

  if (drexIntent?.intent) {
    const percent = typeof intentConfidence === "number" ? ` (${Math.round(intentConfidence * 100)}% confident)` : "";
    response += ` — Drex read this as “${intent}”${percent}.`;
  }
  addMessage("assistant", response);
});

researchButton.addEventListener("click", async () => {
  const query = askInput.value.trim() || `recipe ideas using ${fridgeInventory.join(", ") || "seasonal ingredients"}`;
  researchButton.disabled = true;
  addMessage("user", `Research: ${query}`);
  try {
    const response = await fetch("/api/research-recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "KeenAble request failed");
    const sources = (result.results || []).slice(0, 3).map((item) => `${item.title} — ${item.url}`).join("\n");
    addMessage("assistant", sources ? `KeenAble found these sources:\n${sources}` : "KeenAble did not find matching sources.");
  } catch (error) {
    addMessage("assistant", `KeenAble research unavailable: ${error.message}`);
  } finally {
    researchButton.disabled = false;
  }
});
