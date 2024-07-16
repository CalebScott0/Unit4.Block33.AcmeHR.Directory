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

    INSERT INTO employees(name, department_id) VALUES('Carlitos', (SELECT id FROM department
    WHERE name LIKE 'Man%'));
    INSERT INTO employees(name, department_id) VALUES('Robert', (SELECT id FROM department
    WHERE name LIKE 'Hum%'));
    INSERT INTO employees(name, department_id) VALUES('Jess', (SELECT id FROM department
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
        const SQL=`SELECT * FROM employees`;
        const response = await client.query(SQL);
        res.send(response.rows);
    } catch (error) {
        next(error)
    }
});

server.get("/api/departments", async (req, res, next) => {
    try {
        const SQL=`SELECT * FROM departments`;
        const response = await client.query(SQL);
        res.send(response.rows);
    } catch (error) {
        next(error)
    }
});

server.post("/api/employees", async (req, res, next) => {
  try {
    const {name, department_id} = req.body;
  } catch (error) {
    next(error);
  }
});

server.put("/api/employees/:id", async (req, res, next) => {});

server.delete("/api/employees/:id", async (req, res, next) => {});

// error handling route returns object with error property
server.use((err, req, res) => {
  res.status(res.status || 500).send({ error: err });
});
