import { connectDb } from "../config/db.js";
import { Route } from "../models/Route.js";
import { Stop } from "../models/Stop.js";

const routes = [
  { routeCode: "R001", routeName: "Rajgurunagar", busNumber: "MH 14 LS 0076" },
  { routeCode: "R002", routeName: "Kasarwadi", busNumber: "MH 14 LS 7600" },
  { routeCode: "R003", routeName: "Kharadi", busNumber: "MH 14 LR 7601" }
];

const stopMap = {
  Rajgurunagar: ["Dange Chowk", "Birla Hospital"],
  Kasarwadi: ["Bijali Nagar", "Sambhaji Chowk"],
  Kharadi: ["Bhel Chowk", "LIC Chowk"]
};

async function run() {
  await connectDb();

  for (const routeData of routes) {
    const route = await Route.findOneAndUpdate(
      { routeCode: routeData.routeCode },
      routeData,
      { new: true, upsert: true }
    );

    const stopNames = stopMap[route.routeName] || [];
    const stopIds = [];

    for (const [index, stopName] of stopNames.entries()) {
      const stop = await Stop.findOneAndUpdate(
        { routeId: route._id, stopName },
        { routeId: route._id, stopName, stopOrder: index + 1, status: "active" },
        { new: true, upsert: true }
      );
      stopIds.push(stop._id);
    }

    route.stopIds = stopIds;
    await route.save();
  }

  console.log("Sample routes and stops seeded");
  process.exit(0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
