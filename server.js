const pg = require("pg");
const express = require("express");

// instantiate a pg client
const client = new pg.Client(
  process.env.DATABSE_URL || "postgres://localhost/acme_hr_directory_db"
);
// create express server
const server = express();

const init = async () => {
  // connect to client
  await client.connect();
  console.log("client connected");
  let SQL = ``;

  // create tables - drop child first
  SQL = `
        DROP TABLE IF EXISTS employees;
        DROP TABLE IF EXISTS departments;

        CREATE TABLE departments(
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL
        );
        CREATE TABLE employees(
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT now(),
            updated_at TIMESTAMP DEFAULT now(),
            department_id INTEGER REFERENCES departments(id) NOT NULL
            );
        `;
  await client.query(SQL);
  console.log("tables created");

  // Seed data
  SQL = `
    INSERT INTO departments(name) VALUES('Accounting');
    INSERT INTO departments(name) VALUES('Human Resources');
    INSERT INTO departments(name) VALUES('Management');

    INSERT INTO employees(name, department_id) VALUES('Carlitos', (SELECT id FROM departments
    WHERE name LIKE 'Man%'));
    INSERT INTO employees(name, department_id) VALUES('Robert', (SELECT id FROM departments
    WHERE name LIKE 'Hum%'));
    INSERT INTO employees(name, department_id) VALUES('Jess', (SELECT id FROM departments
    WHERE name LIKE 'Acc%'));
  `;
  await client.query(SQL);
  console.log("seeded data");

  //   listen with server on port
  const PORT = process.env.port || 3000;
  server.listen(PORT, () => {
    console.log(`Server listening on PORT ${PORT}`);
  });
};
init();

server.use(express.json());
server.use(require("morgan")("dev"));
// create routes
server.get("/api/employees", async (req, res, next) => {
  try {
    const SQL = `SELECT * FROM employees ORDER BY id DESC`;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (error) {
    next(error);
  }
});

server.get("/api/departments", async (req, res, next) => {
  try {
    const SQL = `SELECT * FROM departments`;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (error) {
    next(error);
  }
});

server.post("/api/employees", async (req, res, next) => {
  try {
    const { name, department_id } = req.body;
    const SQL = `INSERT INTO employees(name, department_id) VALUES($1, $2) RETURNING *`;
    const response = await client.query(SQL, [name, department_id]);
    res.status(201).send(response.rows[0]);
  } catch (error) {
    next(error);
  }
});

server.put("/api/employees/:id", async (req, res, next) => {
  try {
    const { name, department_id } = req.body;
    const SQL = `UPDATE employees SET name=$1, department_id=$2, updated_at=now()
    WHERE id=$3 RETURNING *`;
    const response = await client.query(SQL, [
      name,
      department_id,
      req.params.id,
    ]);
    res.send(response.rows[0]);
  } catch (error) {
    next(error);
  }
});

server.delete("/api/employees/:id", async (req, res, next) => {
  try {
    const SQL = `DELETE FROM employees WHERE id=$1`;
    await client.query(SQL, [req.params.id]);
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

// error handling route returns object with error property
server.use((err, req, res) => {
  res.status(res.status || 500).send({ error: err });
});
