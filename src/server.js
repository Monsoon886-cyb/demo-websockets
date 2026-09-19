import express from "express";

import { matchRouter } from "./Routes/matchesRouter.js";

const app = express();
const PORT = 8000;

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Server is up and running");
});

app.use("/match", matchRouter);

app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
