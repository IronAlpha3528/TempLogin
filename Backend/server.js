import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();

const BASE_URL = "https://api.mail.tm/";

app.use(express.json());
app.use(cors());

const PORT = 8080;

let account = {
  id: "",
  email: "",
  token: "",
  password: "",
  createdAt: "",
  status: "",
};

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
    const response = await axios.get(BASE_URL + "domains");
    let domains = response.data["hydra:member"];
    // console.log(domains);

    const domain = domains[0].domain;
    return domain;
  } catch (error) {
    console.log(error.response?.data || error.message);
    throw new Error("Could not get Domains");
  }
}

app.get("/listdomains", async (req, res) => {
  try {
    const domains = await getDomains();
    res.status(200).type("text/json").send(domains);
  } catch (error) {
    console.error(`List Domain error: ${error}`);
    res.status(404).json({ error: "Failed to fetch domains" });
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
    const { name = "user" + Date.now(), password = "Pass12345" } = req.body || {};

    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const domain = await getDomains();
    const emailId = `${name}@${domain}`;

    const response = await axios.post(BASE_URL + "accounts", {
      address: emailId,
      password,
    });

    const token = await getToken(emailId, password);

    if (!token) {
      return res.status(500).json({ error: "Failed to get authentication token" });
    }

    account["id"] = response.data.id;
    account["email"] = emailId;
    account["token"] = token;
    account["password"] = password;
    account["createdAt"] = response.data.createdAt;
    account["status"] = "active";

    res.status(200).json({
      message: "Account created successfully",
      data: account,
    });
  } catch (error) {
    console.error("Account creation error:", error.response?.data || error.message);
    res.status(500).json({ error: "Account creation failed" });
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

  try {
    const response = await getAccountInfo(token);
    res.status(200).json(response);
  } catch (error) {
    console.error(`Error in getting account info: ${error}`);
    res.status(500).json({ error: "Failed to retrieve account information" });
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
  if (!text) return null;
  // Match 4-6 digit codes with optional spaces or special chars around them
  const match = text.match(/(?:^|\s|\D)(\d{4,6})(?:\s|\D|$)/);
  return match ? match[1].trim() : null;
}

app.get("/messages/:id", authMiddleware, async (req, res) => {
  const id = req.params.id;
  const token = req.token;

  try {
    const message = await getMessageByID(id, token);

    if (!message) return res.status(404).send("Message not found");

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
  const { page = 1 } = req.query;
  const token = req.token;

  try {
    const response = await getMessages(token, page);

    const resData = {
      numberOfMessages: response["hydra:totalItems"],
      intros: response["hydra:member"],
    };

    res.status(200).json(resData);
  } catch (error) {
    console.error(`Error in getting messages: ${error}`);
    res.status(400).json({ error: error.message || "Failed to fetch messages" });
  }
});

async function getOTP(token, latestID) {
  const latestMessage = await getMessageByID(latestID, token);

  if (!latestMessage) {
    throw new Error("Message not found");
  }

  const otp = extractOTP(latestMessage.subject || latestMessage.text);

  if (!otp) throw new Error("No OTP found in message");

  return otp;
}

app.get("/otp/wait", authMiddleware, async (req, res) => {
  const { lastID } = req.query;
  const token = req.token;

  const maxAttempts = 20; // 20 attempts * 3s = 60s timeout

  try {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await getMessages(token, 1);
      const messages = response["hydra:member"];

      if (messages && messages.length > 0) {
        const currLastID = messages[0].id;

        if (currLastID !== lastID || !lastID) {
          try {
            const otp = await getOTP(token, currLastID);
            return res.json({
              status: "Success",
              otp,
            });
          } catch (e) {
            console.log("Found email, but couldn't extract OTP:", e.message);
          }
        }
      }

      if (i < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    return res.status(408).json({ error: "Timeout waiting for OTP" });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

app.get("/otp", authMiddleware, async (req, res) => {
  const token = req.token;

  try {
    const response = await getMessages(token, 1);
    const messages = response["hydra:member"];

    if (!messages || messages.length === 0) {
      return res.status(404).json({ error: "No messages found" });
    }

    const latestID = messages[0].id;

    const otp = await getOTP(token, latestID);

    return res.json({
      id: latestID,
      otp,
    });
  } catch (error) {
    console.error("OTP fetch error:", error.message);
    return res.status(500).json({ error: error.message || "Failed to extract OTP" });
  }
});

async function deleteAccount(id, token) {
  const response = await axios.delete(BASE_URL + `accounts/${id}`, {
    params: {
      id: id,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response;
}

app.delete("/delete", authMiddleware, async (req, res) => {
  const token = req.token;
  const id = account["id"];

  if (!id) {
    return res.status(400).json({ error: "No account found to delete" });
  }

  try {
    const response = await deleteAccount(id, token);

    if (response["status"] !== 204) {
      return res.status(400).json({ error: "Account deletion failed" });
    }

    // Clear account data
    for (const key in account) {
      account[key] = "";
    }

    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete account error:", error.message);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

// Status endpoint to check if account exists
app.get("/status", (req, res) => {
  if (account.email) {
    res.status(200).json({
      status: "active",
      email: account.email,
      createdAt: account.createdAt,
    });
  } else {
    res.status(200).json({
      status: "inactive",
      message: "No account created yet",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
