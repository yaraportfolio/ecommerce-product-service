CREATE TABLE IF NOT EXISTS products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock INT DEFAULT 0,
  category VARCHAR(100),
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO products (name, description, price, stock, category) VALUES
('iPhone 15 Pro', 'Smartphone Apple dernière génération', 1199.99, 50, 'Smartphones'),
('Samsung Galaxy S24', 'Smartphone Samsung flagship', 1099.99, 44, 'Smartphones'),
('MacBook Pro M3', 'Ordinateur portable Apple', 2499.99, 30, 'Computers'),
('Dell XPS 15', 'Laptop professionnel', 1899.99, 25, 'Computers'),
('iPad Air M2', 'Tablette Apple', 749.99, 40, 'Tablets');