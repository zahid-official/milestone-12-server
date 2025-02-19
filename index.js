require("dotenv").config();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const app = express();
const stripe = require("stripe")(process.env.STRIPE_KEY);
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// custom middleware for jwt verify
const verifyJWT = (req, res, next) => {
  const token = req.headers?.authorization;

  if (!token) {
    return res.status(401).send({ message: "Unauthorize Access" });
  }

  // verify both tokens
  jwt.verify(token, process.env.ACCESS_TOKEN, (error, decoded) => {
    if (error) {
      return res.status(401).send({ message: "Unauthorize Access" });
    }
    // creating a new property in req object
    req.decodedToken = decoded;
    next();
  });
};

// MongoDB
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.rjxsn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1`;

// Create a MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // database
    const database = client.db("scholarshipDB");
    const usersCollection = database.collection("usersCollection");
    const scholarshipCollection = database.collection("scholarshipCollection");
    const appliedScholarshipCollection = database.collection(
      "appliedScholarshipCollection"
    );
    const reviewCollection = database.collection("reviewCollection");

    // custom middleware for verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decodedToken.email;
      const query = { email };
      const userData = await usersCollection.findOne(query);
      const admin = userData?.role === "Admin";
      if (!admin) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      next();
    };

    // custom middleware for verify moderator after verifyToken
    const verifyModerator = async (req, res, next) => {
      const email = req.decodedToken.email;
      const query = { email };
      const userData = await usersCollection.findOne(query);
      const moderator =
        userData?.role === "Admin" || userData?.role === "Moderator";
      if (!moderator) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      next();
    };

    // jwt token generate (only for personal info based route)
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // read Operation (conncet 2 server)
    app.get("/", (req, res) => {
      res.send("Server Connected Successfully");
    });

    // manage users data
    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // role base user
    app.get("/users/role/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      // verify JWT email
      if (req.decodedToken.email !== email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }

      const query = { email };
      const userData = await usersCollection.findOne(query);

      let user = false;
      let admin = false;
      let moderator = false;

      if (userData?.role === "Admin") {
        admin = true;
      } else if (userData?.role === "Moderator") {
        moderator = true;
      } else {
        user = true;
      }

      res.send({ admin, moderator, user });
    });

    // filter users
    app.get("/filter/:role", async (req, res) => {
      const role = req.params.role;
      const query = { role };
      const cursor = usersCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });











    // filter by date
    app.get("/filterDate/:date", async (req, res) => {
      const date = req.params.date;

      let query = {};
      let sortField = {};
      let sortOrder = -1;

      // check clientside value
      if (date === "currentDate") {
        query = { currentDate: { $exists: true } };
        sortField = { currentDate: sortOrder };
      } else if (date === "deadline") {
        query = { deadline: { $exists: true } };
        sortField = { deadline: sortOrder };
      }

      const result = await appliedScholarshipCollection
        .find(query)
        .sort(sortField)
        .toArray();
      res.send(result);
    });


    // sorting
    app.get("/sorting/:type", async(req, res) => {
      const type = req.params.type;
      const query = {}
      const sortOrder = type === "Ascending" ? 1 : -1; 
      const result = await scholarshipCollection.find(query).sort({ applicationFees: sortOrder }).toArray();
      res.send(result);
    })








    // top scholarship
    app.get("/topScholarship", async (req, res) => {
      const ratings = await reviewCollection
        .aggregate([
          {
            $group: {
              _id: "$scholarshipId",
              averageRating: { $avg: "$rating" },
            },
          },
        ])
        .toArray();

      // latest data based on lowest applicationFees
      const scholarships = await scholarshipCollection
        .find()
        .sort({ applicationFees: 1, _id: -1 })
        .limit(6)
        .toArray();

      // ratingCollection avgRating adding in scholarshipCollection
      let result = scholarships.map((scholarship) => {
        let rating = ratings.find((i) => i._id === scholarship._id.toString());

        // adding avgRating as new objectProperty
        scholarship.avgRating = rating ? rating.averageRating : "";
        return scholarship;
      });

      res.send(result);
    });
















    // scholarship Details
    app.get("/scholarshipDetails/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await scholarshipCollection.findOne(query);
      res.send(result);
    });

    // userId for applicantDetails
    app.get("/usersId/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    // all scholarships
    app.get("/allScholarships", async (req, res) => {
      const result = await scholarshipCollection.find().toArray();
      res.send(result);
    });

    // applied scholarships
    app.get("/appliedScholarships", async (req, res) => {
      const result = await appliedScholarshipCollection.find().toArray();
      res.send(result);
    });

    // my scholarships
    app.get("/myScholarships/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await appliedScholarshipCollection.find(query).toArray();
      res.send(result);
    });

    // all Reviews
    app.get("/allReviews", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

    // my scholarships
    app.get("/myReviews/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await reviewCollection.find(query).toArray();
      res.send(result);
    });

    // review for scholarship details
    app.get("/stroies/:id", async (req, res) => {
      const scholarshipId = req.params.id;
      const query = { scholarshipId };
      const result = await reviewCollection.find(query).toArray();
      res.send(result);
    });

    // search for allScholarships
    app.get("/search", async (req, res) => {
      const { searchQuery } = req.query;
      let option = {};
      if (searchQuery) {
        option = {
          $or: [
            { universityName: { $regex: searchQuery, $options: "i" } },
            { scholarshipName: { $regex: searchQuery, $options: "i" } },
            { degree: { $regex: searchQuery, $options: "i" } },
          ],
        };

        const result = await scholarshipCollection.find(option).toArray();
        res.send(result);
      }
    });

    // pagination
    app.get("/allScholarshipPagination", async (req, res) => {
      const pageNo = parseInt(req.query.pageNo - 1);
      const pageItems = parseInt(req.query.pageItems);

      const cursor = scholarshipCollection
        .find()
        .skip(pageNo * pageItems)
        .limit(pageItems);
      const result = await cursor.toArray();
      res.send(result);
    });

    // pagination for visas
    app.get("/total", async (req, res) => {
      const count = await scholarshipCollection.estimatedDocumentCount();
      res.send({ count });
    });

    // create Operation (create User)
    app.post("/users", async (req, res) => {
      const user = req.body;

      // set role
      if (!user.role) {
        user.role = "User";
      }

      // validate existing user
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User Already Exist", insertedId: null });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // add scholarship
    app.post(
      "/addScholarship",
      verifyJWT,
      verifyModerator,
      async (req, res) => {
        const data = req.body;
        const result = await scholarshipCollection.insertOne(data);
        res.send(result);
      }
    );

    // stripe paymentIntent
    app.post("/stripe", async (req, res) => {
      const price = req.body.fee;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // applied Scholarship Collection
    app.post("/appliedScholarship", async (req, res) => {
      const data = req.body;
      const result = await appliedScholarshipCollection.insertOne(data);
      res.send(result);
    });

    // add review in Review Collection
    app.post("/addReview", async (req, res) => {
      const data = req.body;
      const result = await reviewCollection.insertOne(data);
      res.send(result);
    });

    // delete Operation (userDelete)
    app.delete("/users/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // delete myApplication
    app.delete("/deleteMyApplication/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await appliedScholarshipCollection.deleteOne(query);
      res.send(result);
    });

    // delete myReview
    app.delete("/deleteMyReview/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await reviewCollection.deleteOne(query);
      res.send(result);
    });

    // delete Scholarship
    app.delete("/deleteScholarship/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await scholarshipCollection.deleteOne(query);
      res.send(result);
    });

    // delete Scholarship
    app.delete("/deleteScholarship/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await scholarshipCollection.deleteOne(query);
      res.send(result);
    });

    // update Operation
    app.patch("/users/role/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const role = req.body.role;

      const query = { _id: new ObjectId(id) };
      const updatedRole = {
        $set: { role },
      };

      const result = await usersCollection.updateOne(query, updatedRole);
      res.send(result);
    });

    // editApplication
    app.patch("/editApplication/:id", async (req, res) => {
      const id = req.params.id;
      const {
        gender,
        sscResult,
        hscResult,
        applyingDegree,
        applicantCountry,
        applicantDistrict,
      } = req.body;

      const query = { _id: new ObjectId(id) };
      const updatedData = {
        $set: {
          gender,
          sscResult,
          hscResult,
          applyingDegree,
          applicantCountry,
          applicantDistrict,
        },
      };

      const result = await appliedScholarshipCollection.updateOne(
        query,
        updatedData
      );
      res.send(result);
    });

    // editReview
    app.patch("/editReview/:id", async (req, res) => {
      const id = req.params.id;
      const { rating, comment, reviewDate } = req.body;

      const query = { _id: new ObjectId(id) };
      const updatedData = {
        $set: {
          rating,
          comment,
          reviewDate,
        },
      };

      const result = await reviewCollection.updateOne(query, updatedData);
      res.send(result);
    });

    // editScholarship
    app.patch("/editScholarship/:id", async (req, res) => {
      const id = req.params.id;
      const {
        universityName,
        universityCountry,
        universityCity,
        universityRank,
        scholarshipName,
        scholarshipCategory,
        subjectCategory,
        deadline,
        degree,
        stipend,
        tuitionFee,
        serviceCharge,
        applicationFees,
      } = req.body;

      const query = { _id: new ObjectId(id) };
      const updatedData = {
        $set: {
          universityName,
          universityCountry,
          universityCity,
          universityRank,
          scholarshipName,
          scholarshipCategory,
          subjectCategory,
          deadline,
          degree,
          stipend,
          tuitionFee,
          serviceCharge,
          applicationFees,
        },
      };

      const result = await scholarshipCollection.updateOne(query, updatedData);
      res.send(result);
    });

    // status update
    app.patch("/appliedScholarship/status/:id", async (req, res) => {
      const id = req.params.id;
      const status = req.body.status;

      const query = { _id: new ObjectId(id) };
      const updatedStatus = {
        $set: { status },
      };

      const result = await appliedScholarshipCollection.updateOne(
        query,
        updatedStatus
      );
      res.send(result);
    });

    // update Status AppliedScholarship
    app.patch("/deleteAppliedScholarship/:id", async (req, res) => {
      const id = req.params.id;

      const status = "Rejected";
      const query = { _id: new ObjectId(id) };
      const updatedData = {
        $set: {
          status,
        },
      };
      const result = await appliedScholarshipCollection.updateOne(
        query,
        updatedData
      );
      res.send(result);
    });

    // feedback
    app.patch("/feedback/:id", async (req, res) => {
      const id = req.params.id;
      const feedback = req.body.feedback;

      const query = { _id: new ObjectId(id) };
      const updatedData = {
        $set: {
          feedback,
        },
      };

      const result = await appliedScholarshipCollection.updateOne(
        query,
        updatedData
      );
      res.send(result);
    });




    
  } finally {
  }
}
run().catch(console.log);

// port running on
app.listen(port, () => {
  console.log(`Server Running on... : ${port}`);
});
