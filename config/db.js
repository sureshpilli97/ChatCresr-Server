const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "mysql",
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 60000,
      idle: 5000,
    },
  }
);

sequelize
  .authenticate()
  .then(() => console.log("Database connected"))
  .catch((err) => console.log("Error: " + err));

module.exports = sequelize;
