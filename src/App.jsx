import { useState, useEffect } from "react";
import "./App.css";

const API_URL = "http://localhost:8080/api/products";

function App() {
  const [page, setPage] = useState("Dashboard");

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState(() =>
    JSON.parse(localStorage.getItem("customers") || "[]")
  );
  const [sales, setSales] = useState(() =>
    JSON.parse(localStorage.getItem("sales") || "[]")
  );

  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [editId, setEditId] = useState(null);

  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");

  const [billCustomer, setBillCustomer] = useState("");
  const [billProduct, setBillProduct] = useState("");
  const [billQty, setBillQty] = useState("1");

  const [loading, setLoading] = useState(false);

  // Load products from the Spring Boot backend
  async function loadProducts() {
    try {
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error("Unable to load products");
      }

      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Product loading error:", error);
      alert(
        "Could not load products. Please check whether the backend is running."
      );
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  // Save products in React state
  function saveProducts(list) {
    setProducts(list);
  }

  // Save customers in localStorage
  function saveCustomers(list) {
    setCustomers(list);
    localStorage.setItem("customers", JSON.stringify(list));
  }

  // Add or update product
  async function addProduct(e) {
    e.preventDefault();

    if (
      !id.trim() ||
      !name.trim() ||
      price === "" ||
      quantity === ""
    ) {
      alert("Please fill all product fields");
      return;
    }

    if (
      !Number.isFinite(Number(price)) ||
      !Number.isInteger(Number(quantity)) ||
      Number(price) < 0 ||
      Number(quantity) < 0
    ) {
      alert("Enter a valid price and whole-number quantity");
      return;
    }

    const duplicate = products.some(
      (p) =>
        String(p.productCode || "") === id.trim() &&
        Number(p.id) !== Number(editId)
    );

    if (duplicate) {
      alert("Product ID already exists");
      return;
    }

    const productData = {
      productCode: id.trim(),
      name: name.trim(),
      category: "General",
      price: Number(price),
      quantity: Number(quantity),
    };

    try {
      setLoading(true);

      const isEditing = editId !== null;

      const response = await fetch(
        isEditing ? `${API_URL}/${editId}` : API_URL,
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(productData),
        }
      );

      if (!response.ok) {
        throw new Error("Could not save product");
      }

      await response.json();
      await loadProducts();

      alert(
        isEditing
          ? "Product updated successfully!"
          : "Product added successfully!"
      );

      clearProductForm();
    } catch (error) {
      console.error("Product save error:", error);
      alert("Could not save product. Please check the backend.");
    } finally {
      setLoading(false);
    }
  }

  // Edit product
  function editProduct(product) {
    setId(product.productCode || "");
    setName(product.name || "");
    setPrice(String(product.price ?? ""));
    setQuantity(String(product.quantity ?? ""));
    setEditId(product.id);
    setPage("Products");
  }

  // Clear product form
  function clearProductForm() {
    setId("");
    setName("");
    setPrice("");
    setQuantity("");
    setEditId(null);
  }

  // Delete product
  async function deleteProduct(productId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`${API_URL}/${productId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Could not delete product");
      }

      await loadProducts();

      if (Number(editId) === Number(productId)) {
        clearProductForm();
      }

      alert("Product deleted successfully!");
    } catch (error) {
      console.error("Product delete error:", error);
      alert("Could not delete product. Please check the backend.");
    }
  }

  // Add customer
  function addCustomer(e) {
    e.preventDefault();

    if (!customer.trim() || !phone.trim()) {
      alert("Enter customer name and phone number");
      return;
    }

    if (customers.some((c) => c.phone === phone.trim())) {
      alert("This phone number already exists");
      return;
    }

    const newCustomer = {
      id: Date.now(),
      name: customer.trim(),
      phone: phone.trim(),
    };

    saveCustomers([...customers, newCustomer]);

    setCustomer("");
    setPhone("");

    alert("Customer added successfully!");
  }

  // Generate bill
  async function generateBill(e) {
    e.preventDefault();

    // Compare IDs as strings to avoid number/string mismatch
    const selectedProduct = products.find(
      (p) => String(p.id) === String(billProduct)
    );

    const selectedCustomer = customers.find(
      (c) => String(c.id) === String(billCustomer)
    );

    const qty = Number(billQty);

    if (!selectedCustomer || !selectedProduct) {
      alert("Please select a customer and product");
      return;
    }

    if (!Number.isInteger(qty) || qty <= 0) {
      alert("Enter a valid quantity");
      return;
    }

    if (qty > Number(selectedProduct.quantity)) {
      alert("Not enough stock available");
      return;
    }

    const unitPrice = Number(selectedProduct.price);
    const total = unitPrice * qty;
    const remainingStock = Number(selectedProduct.quantity) - qty;

    const bill = {
      id: Date.now(),
      customer: selectedCustomer.name,
      phone: selectedCustomer.phone,
      product: selectedProduct.name,
      quantity: qty,
      price: unitPrice,
      total,
      date: new Date().toLocaleString(),
    };

    try {
      setLoading(true);

      // Update inventory in the backend before completing the bill
      const updatedProduct = {
        productCode: selectedProduct.productCode || "",
        name: selectedProduct.name,
        category: selectedProduct.category || "General",
        price: unitPrice,
        quantity: remainingStock,
      };

      const response = await fetch(
        `${API_URL}/${selectedProduct.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedProduct),
        }
      );

      if (!response.ok) {
        throw new Error("Could not update inventory");
      }

      await response.json();

      // Refresh product stock
      await loadProducts();

      // Save sales history
      const updatedSales = [bill, ...sales];

      setSales(updatedSales);
      localStorage.setItem("sales", JSON.stringify(updatedSales));

      alert(
        `Bill generated successfully!\n\n` +
        `Customer: ${selectedCustomer.name}\n` +
        `Product: ${selectedProduct.name}\n` +
        `Quantity: ${qty}\n` +
        `Price: ₹${unitPrice.toFixed(2)}\n` +
        `Total: ₹${total.toFixed(2)}`
      );

      setBillCustomer("");
      setBillProduct("");
      setBillQty("1");
    } catch (error) {
      console.error("Billing error:", error);
      alert("Could not complete billing. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Calculate bill total
  const selected = products.find(
    (p) => String(p.id) === String(billProduct)
  );

  const total = selected
    ? Number(selected.price) * Number(billQty || 0)
    : 0;

  const totalSales = sales.reduce(
    (sum, sale) => sum + Number(sale.total || 0),
    0
  );

  return (
    <div className="app">
      <aside className="sidebar">
        <h2>Smart Retail</h2>

        {[
          "Dashboard",
          "Products",
          "Inventory",
          "Customers",
          "Billing",
          "Sales History",
        ].map((item) => (
          <button
            key={item}
            type="button"
            className="menu-item"
            onClick={() => setPage(item)}
          >
            {item}
          </button>
        ))}
      </aside>

      <main className="main-content">
        <header className="topbar">
          <h2>{page}</h2>
          <p>Admin</p>
        </header>

        {/* Dashboard */}
        {page === "Dashboard" && (
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Products</h3>
              <p>{products.length}</p>
            </div>

            <div className="stat-card">
              <h3>Total Customers</h3>
              <p>{customers.length}</p>
            </div>

            <div className="stat-card">
              <h3>Total Bills</h3>
              <p>{sales.length}</p>
            </div>

            <div className="stat-card">
              <h3>Total Sales</h3>
              <p>₹{totalSales.toFixed(2)}</p>
            </div>
          </div>
        )}

        {/* Products */}
        {page === "Products" && (
          <section className="panel">
            <h2>{editId !== null ? "Edit Product" : "Add Product"}</h2>

            <form className="product-form" onSubmit={addProduct}>
              <input
                placeholder="Product ID"
                value={id}
                onChange={(e) => setId(e.target.value)}
                required
              />

              <input
                placeholder="Product Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <input
                placeholder="Price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />

              <input
                placeholder="Quantity"
                type="number"
                min="0"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />

              <button
                className="primary-button"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Please wait..."
                  : editId !== null
                    ? "Update Product"
                    : "Add Product"}
              </button>

              {editId !== null && (
                <button type="button" onClick={clearProductForm}>
                  Cancel Edit
                </button>
              )}
            </form>

            <h3>Product List</h3>

            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.productCode || p.id}</td>
                    <td>{p.name}</td>
                    <td>₹{Number(p.price).toFixed(2)}</td>
                    <td>{p.quantity}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => editProduct(p)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteProduct(p.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {products.length === 0 && <p>No products added yet.</p>}
          </section>
        )}

        {/* Inventory */}
        {page === "Inventory" && (
          <section className="panel">
            <h2>Inventory Management</h2>

            <table>
              <thead>
                <tr>
                  <th>Product ID</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.productCode || p.id}</td>
                    <td>{p.name}</td>
                    <td>{p.quantity}</td>
                    <td
                      className={
                        Number(p.quantity) < 5
                          ? "stock-low"
                          : "stock-good"
                      }
                    >
                      {Number(p.quantity) < 5
                        ? "Low Stock"
                        : "Available"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {products.length === 0 && <p>No inventory available.</p>}
          </section>
        )}

        {/* Customers */}
        {page === "Customers" && (
          <section className="panel">
            <h2>Add Customer</h2>

            <form className="product-form" onSubmit={addCustomer}>
              <input
                placeholder="Customer Name"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                required
              />

              <input
                placeholder="Phone Number"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />

              <button className="primary-button" type="submit">
                Add Customer
              </button>
            </form>

            <h3>Customer List</h3>

            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                </tr>
              </thead>

              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {customers.length === 0 && <p>No customers added yet.</p>}
          </section>
        )}

        {/* Billing */}
        {page === "Billing" && (
          <section className="panel">
            <h2>Generate Customer Bill</h2>

            <form className="product-form" onSubmit={generateBill}>
              <label>Customer</label>

              <select
                value={billCustomer}
                onChange={(e) => setBillCustomer(e.target.value)}
                required
              >
                <option value="">Select Customer</option>

                {customers.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name} - {c.phone}
                  </option>
                ))}
              </select>

              <label>Product</label>

              <select
                value={billProduct}
                onChange={(e) => setBillProduct(e.target.value)}
                required
              >
                <option value="">Select Product</option>

                {products
                  .filter((p) => Number(p.quantity) > 0)
                  .map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name} - ₹{Number(p.price).toFixed(2)} (Stock:{" "}
                      {p.quantity})
                    </option>
                  ))}
              </select>

              <label>Quantity</label>

              <input
                type="number"
                min="1"
                step="1"
                value={billQty}
                onChange={(e) => setBillQty(e.target.value)}
                required
              />

              <h3>Bill Total: ₹{total.toFixed(2)}</h3>

              <button
                className="primary-button"
                type="submit"
                disabled={loading}
              >
                {loading ? "Processing..." : "Generate Bill"}
              </button>
            </form>
          </section>
        )}

        {/* Sales History */}
        {page === "Sales History" && (
          <section className="panel">
            <h2>Sales History</h2>

            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Total</th>
                </tr>
              </thead>

              <tbody>
                {sales.map((s) => (
                  <tr key={s.id}>
                    <td>{s.date}</td>
                    <td>{s.customer}</td>
                    <td>{s.product}</td>
                    <td>{s.quantity}</td>
                    <td>₹{Number(s.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {sales.length === 0 && <p>No sales recorded yet.</p>}
          </section>
        )}

        <footer className="footer">
          Smart Billing Retailing Inventory System
        </footer>
      </main>
    </div>
  );
}

export default App;
