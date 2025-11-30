module.exports = {
  port: 5000,

  mongo: {
    uri: "mongodb+srv://<DB_USER>:<DB_PASS>@<CLUSTER_HOST>/<DB_NAME>?retryWrites=true&w=majority&appName=EAS"
  },

  jwt: {
    secret: "your_jwt_secret_here",
    expiresIn: "30d"
  }
};
