import { Router } from "express";
import { getPf2Options } from "../services/pf2DataService.js";

export const pf2Router = Router();

pf2Router.get("/pf2/options", async (req, res, next) => {
  try {
    res.json(await getPf2Options({ source: req.query.source || "auto" }));
  } catch (error) {
    next(error);
  }
});
