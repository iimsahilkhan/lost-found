// ---------- Supabase config ----------
// NOTE: inko apne Supabase dashboard se copy karke yahan paste karo
const SUPABASE_URL = "https://xidxicyppxalxtacznmq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpZHhpY3lwcHhhbHh0YWN6bm1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MjU4NTMsImV4cCI6MjA4NzAwMTg1M30.Qxj6Mc4IetuwIIg5rpr__K2wEbreLV-IPe51C1rrv7w";
const STORAGE_BUCKET = "item-images"; // is naam ka bucket Supabase me banao

// Supabase client (global `supabase` index.html me CDN se aa raha hai)
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- UI references ----------
let items = [];

const form = document.getElementById("item-form");
const itemsList = document.getElementById("items-list");
const filterType = document.getElementById("filter-type");
const yearSpan = document.getElementById("year");

yearSpan.textContent = new Date().getFullYear();

form.addEventListener("submit", handleFormSubmit);
filterType.addEventListener("change", () => renderItems());

// ---------- Form submit -> upload image + save row ----------
async function handleFormSubmit(event) {
  event.preventDefault();

  const formData = new FormData(form);

  const type = formData.get("type") || "lost";
  const title = formData.get("title")?.trim() || "";
  const category = formData.get("category") || "Others";
  const location = formData.get("location")?.trim() || "";
  const date = formData.get("date") || "";
  const description = formData.get("description")?.trim() || "";
  const contact = formData.get("contact")?.trim() || "";
  const file = formData.get("photo");

  let imageUrl = null;

  // 1) Image Supabase Storage me upload karo (agar diya hai)
  if (file && file.size > 0) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const filePath = `items/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const { data: uploadData, error: uploadError } = await supabaseClient
      .storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file);

    if (uploadError) {
      alert("Image upload failed: " + uploadError.message);
      return;
    }

    const { data: publicUrlData } = supabaseClient
      .storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(uploadData.path);

    imageUrl = publicUrlData?.publicUrl || null;
  }

  // 2) Row items table me insert karo
  const { error: insertError } = await supabaseClient.from("items").insert({
    type,
    title,
    category,
    location,
    date,
    description,
    contact,
    image_url: imageUrl
  });

  if (insertError) {
    alert("Failed to post item: " + insertError.message);
    return;
  }

  form.reset();
  await fetchItems();
}

// ---------- DB se items fetch ----------
async function fetchItems() {
  const { data, error } = await supabaseClient
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching items:", error);
    items = [];
  } else {
    items = data || [];
  }

  renderItems();
}

// ---------- Render list ----------
function renderItems() {
  itemsList.innerHTML = "";

  const filterValue = filterType.value;
  const visibleItems =
    filterValue === "all"
      ? items
      : items.filter(item => item.type === filterValue);

  if (!visibleItems.length) {
    const emptyDiv = document.createElement("div");
    emptyDiv.className = "empty-state";
    emptyDiv.textContent =
      "No items posted yet. Be the first to report a lost or found item.";
    itemsList.appendChild(emptyDiv);
    return;
  }

  visibleItems.forEach(item => {
    const card = document.createElement("article");
    card.className = "item-card";

    if (item.image_url) {
      const imageWrapper = document.createElement("div");
      imageWrapper.className = "item-image-wrapper";

      const img = document.createElement("img");
      img.src = item.image_url;
      img.alt = item.title || "Item image";

      imageWrapper.appendChild(img);
      card.appendChild(imageWrapper);
    }

    const tag = document.createElement("span");
    tag.className = `item-tag ${item.type}`;
    tag.textContent = item.type === "lost" ? "Lost" : "Found";
    card.appendChild(tag);

    const titleEl = document.createElement("h3");
    titleEl.className = "item-title";
    titleEl.textContent = item.title || "Unnamed item";
    card.appendChild(titleEl);

    const meta = document.createElement("div");
    meta.className = "item-meta";

    const categorySpan = document.createElement("span");
    categorySpan.textContent = item.category;
    meta.appendChild(categorySpan);

    if (item.location) {
      const locSpan = document.createElement("span");
      locSpan.textContent = item.location;
      meta.appendChild(locSpan);
    }

    if (item.date) {
      const dateSpan = document.createElement("span");
      dateSpan.textContent = formatDisplayDate(item.date);
      meta.appendChild(dateSpan);
    }

    card.appendChild(meta);

    if (item.description) {
      const desc = document.createElement("p");
      desc.className = "item-desc";
      desc.textContent = item.description;
      card.appendChild(desc);
    }

    if (item.contact) {
      const contact = document.createElement("p");
      contact.className = "item-contact";
      contact.textContent = `Contact: ${item.contact}`;
      card.appendChild(contact);
    }

    itemsList.appendChild(card);
  });
}

function formatDisplayDate(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

// Page load par DB se data lao
fetchItems();