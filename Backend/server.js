import express from "express";
import axios from "axios";

const app = express();

const BASE_URL = "https://api.mail.tm/";

app.use(express.json());

const PORT = 8080;

let domains = [];

// Middleware to more better access the token from req.headers.authorization to req.token
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).send("Missing Authorization Header");
    return;
  }

  const parts = authHeader.split(" ");

  if (parts[0] != "Bearer" || !parts[1]) {
    res.status(401).send("Invalid token format");
    return;
  }

  req.token = parts[1];
  next();
}

// Returns the available domains
async function getDomains() {
  try {
    if (domains.length === 0) {
      const response = await axios.get(BASE_URL + "domains");
      domains = response.data["hydra:member"];
    }
    domains = domains.map((ele) => ele.domain);
    return domains;
  } catch (error) {
    console.log(error.response?.data || error.message);
    return [];
  }
}

app.get("/listdomains", async (req, res) => {
  try {
    domains = await getDomains();
    console.log(domains);
    res.status(200).type("text/json").send(domains.join("\n"));
  } catch (error) {
    console.log(`List Domain error, ${error}`);
    res.status(404).send("Error");
  }
});

async function getToken(address, password) {
  try {
    const response = await axios.post(BASE_URL + "token", {
      address,
      password,
    });
    return response["data"].token;
  } catch (error) {
    console.log(`Get Token Error, ${error}`);
    return;
  }
}

app.post("/create", async (req, res) => {
  try {
    // Putting a password default for testing purpose
    // Username and password is sent in the request body
    // The defaults for name and password should be removed in prod mostly 
    const { name = "user" + Date.now(), password = "Pass12345" } = req.body || {};

    const domains = await getDomains();
    const domain = domains[0];

    const emailId = `${name}@${domain}`;

    const response = await axios.post(BASE_URL + "accounts", {
      address: emailId,
      password,
    });

    const token = await getToken(emailId, password);
    // console.log(token)

    res.status(200).json({
      message: `Account created with token ${token}`,
      data: response.data,
    });
  } catch (error) {
    console.log(error.response?.data || error.message);
    res.status(500).send("Account Creation Error");
  }
});


async function getAccountInfo(token) {
  const response = await axios.get(BASE_URL + "me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // console.log(response.data)
  return response.data;
}

app.get("/me", authMiddleware, async (req, res) => {
  const token = req.token;
  //Splits the Bearer "Token" into Token from the request headers

  try {
    const response = await getAccountInfo(token);
    // console.log(response)
    res.status(200).send(response);
  } catch (error) {
    console.log(`Error in getting account info, ${error}`);
    res.status(500).send("Error");
  }
});

async function getMessageByID(id, token) {
  try {
    const response = await axios.get(BASE_URL + "messages/" + id, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  } catch (err) {
    console.error("getMessageByID error:", err.response?.status, err.response?.data || err.message);
    throw err;
  }
}

function extractOTP(text) {
  return text?.match(/\s?\d{4,6}\s?/)?.[0] || null;
}

app.get("/messages/:id", authMiddleware, async (req, res) => {
  const id = req.params.id;
  const token = req.token;
  console.log("/messages/:id route is being triggered", id);

  try {
    const message = await getMessageByID(id, token);

    if (!message)
      return res.status(404).send("Message not found");

    return res.status(200).json(message);
  } catch (err) {
    console.error(`Error in getting message:`, err.response?.status, err.response?.data || err.message);
    return res.status(500).send("Error in getting message");
  }
});

async function getMessages(token, page) {
  try {
    const response = await axios.get(BASE_URL + "messages", {
      params: {
        page: page,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("getMessages error:", error.response?.status, error.response?.data || error.message);
    throw error;
  }
}

app.get("/messages", authMiddleware, async (req, res) => {
  // console.log("/messages route is being triggered");
  const { page = 1 } = req.query;
  const token = req.token;

  try {
    const response = await getMessages(token, page);

    const resData = {
      "numberOfMessages": response["hydra:totalItems"],
      // "intros": response["hydra:member"].map((item => item.intro))
      "intros": response["hydra:member"]
    }

    console.log(response)

    res.status(200).send(resData);
  } catch (error) {
    console.log(`Error in getting messages, ${error}`);
    res.status(400).send(error.message);
  }
});

app.get("/otp", authMiddleware, async (req, res) => {

  const token = req.token;

  try {
    const response = await getMessages(token, 1)
    const message = response["hydra:member"];

    if (!message.length) {
      return res.status(404).send("No messages");
    }

    const latestID = message[0].id;
    const latestMessage = await getMessageByID(latestID, token)
    const otp = extractOTP(latestMessage.subject || latestMessage.text);
    console.log(otp)
    return res.json({
      id: latestID,
      otp
    });


  } catch (error) {
    return res.status(500).send(`OTP fetch failed, ${error}`)
  }
});

app.get("otp/wait")

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});