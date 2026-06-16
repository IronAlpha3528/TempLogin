import { useState } from "react";
import axios from "axios";

function App() {
  const BASE_URL = "http://localhost:8080";

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const [accountId, setAccountId] = useState("");
  const [content, setContent] = useState([]);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOTP, setLoadingOTP] = useState(false);
  const [loadingWaitOTP, setLoadingWaitOTP] = useState(false);
  const [otp, setOtp] = useState("");
  const [lastMessageId, setLastMessageId] = useState("");
  const [selectedMessage, setSelectedMessage] = useState(null);

  // Copy to clipboard helper
  const copyToClipboard = (text, type = "text") => {
    navigator.clipboard.writeText(text);
    setMessage(`${type} copied to clipboard!`);
    setTimeout(() => setMessage(""), 2000);
  };

  async function createEmail() {
    try {
      setLoadingCreate(true);
      setMessage("");

      const res = await axios.post(BASE_URL + "/create");

      setEmail(res.data.data.email);
      setToken(res.data.data.token);
      setAccountId(res.data.data.id);
      setMessage("✅ Email created successfully!");
      setLoadingCreate(false);
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.error || "Failed to create email";
      setMessage(`❌ ${errorMsg}`);
      setLoadingCreate(false);
    }
  }

  async function deleteEmail() {
    if (!token) {
      setMessage("❌ No email created yet. Create an email first!");
      return;
    }

    try {
      setLoadingDelete(true);
      const response = await axios.delete(BASE_URL + "/delete", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response["status"] === 200) {
        setMessage("✅ Email deleted successfully");
        setEmail("");
        setToken("");
        setAccountId("");
        setContent([]);
        setOtp("");
        setLastMessageId("");
        setLoadingDelete(false);
      } else {
        setMessage("❌ Email deletion error");
        setLoadingDelete(false);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      setMessage(`❌ ${errorMsg}`);
      setLoadingDelete(false);
    }
  }

  async function getMessages() {
    if (!token) {
      setMessage("❌ No email created yet. Create an email first!");
      return;
    }

    try {
      setLoadingMessages(true);
      const response = await axios.get(BASE_URL + "/messages", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const r = response["data"];

      if (r["numberOfMessages"] != 0) {
        const mess_list = r["intros"];

        const extractedMessages = mess_list.map((m) => ({
          subject: m["subject"],
          intro: m["intro"],
          id: m["id"],
        }));

        setContent(extractedMessages);
        setLastMessageId(mess_list[0]["id"]);
        setMessage(`✅ Found ${r["numberOfMessages"]} message(s)`);
      } else {
        setContent([]);
        setMessage("⏳ No messages yet");
      }
      setLoadingMessages(false);
    } catch (error) {
      const errorMsg = error.response?.data?.error || "Error fetching messages";
      setMessage(`❌ ${errorMsg}`);
      setLoadingMessages(false);
    }
  }

  async function getOTPImmediate() {
    if (!token) {
      setMessage("❌ No email created yet. Create an email first!");
      return;
    }

    try {
      setLoadingOTP(true);
      setOtp("");
      const response = await axios.get(BASE_URL + "/otp", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const otpCode = response.data.otp;
      setOtp(otpCode);
      setMessage(`✅ OTP extracted: ${otpCode}`);
      setLoadingOTP(false);
    } catch (error) {
      const errorMsg = error.response?.data?.error || "No OTP found in latest message";
      setMessage(`❌ ${errorMsg}`);
      setLoadingOTP(false);
    }
  }

  async function waitForOTP() {
    if (!token) {
      setMessage("❌ No email created yet. Create an email first!");
      return;
    }

    try {
      setLoadingWaitOTP(true);
      setOtp("");
      setMessage("⏳ Waiting for OTP (up to 60 seconds)...");

      const response = await axios.get(BASE_URL + "/otp/wait", {
        params: {
          lastID: lastMessageId,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const otpCode = response.data.otp;
      setOtp(otpCode);
      setMessage(`✅ OTP received: ${otpCode}`);
      setLoadingWaitOTP(false);
    } catch (error) {
      const errorMsg = error.response?.data?.error || "Timeout waiting for OTP";
      setMessage(`❌ ${errorMsg}`);
      setLoadingWaitOTP(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Temporary Email Dashboard</h1>
          <p className="text-gray-600">Create temp emails and extract OTPs</p>
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg animate-pulse ${
              message.includes("❌") ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
            }`}
          >
            {message}
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Account Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Account</h2>

            <button
              onClick={createEmail}
              disabled={loadingCreate}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg mb-4 transition"
            >
              {loadingCreate ? "Creating..." : "Create New Email"}
            </button>

            {email && (
              <>
                <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="text-sm text-gray-600 mb-2">Email:</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-mono break-all text-gray-800 flex-1">{email}</p>
                    <button
                      onClick={() => copyToClipboard(email, "Email")}
                      className="ml-2 text-blue-500 hover:text-blue-700 text-xs font-semibold p-1"
                      title="Copy email"
                    >
                      📋
                    </button>
                  </div>
                </div>
                <button
                  onClick={deleteEmail}
                  disabled={loadingDelete}
                  className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  {loadingDelete ? "Deleting..." : "Delete Account"}
                </button>
              </>
            )}
          </div>

          {/* OTP Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">OTP Extraction</h2>

            <button
              onClick={getOTPImmediate}
              disabled={loadingOTP || !token}
              className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg mb-3 transition"
            >
              {loadingOTP ? "Fetching..." : "Get OTP"}
            </button>

            <button
              onClick={waitForOTP}
              disabled={loadingWaitOTP || !token}
              className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg mb-4 transition"
            >
              {loadingWaitOTP ? "Waiting..." : "Wait for OTP (60s)"}
            </button>

            {otp && (
              <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">OTP Code:</p>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold text-yellow-600 tracking-widest">{otp}</p>
                  <button
                    onClick={() => copyToClipboard(otp, "OTP")}
                    className="text-yellow-600 hover:text-yellow-800 font-semibold"
                    title="Copy OTP"
                  >
                    📋
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Messages Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Messages</h2>

            <button
              onClick={getMessages}
              disabled={loadingMessages || !token}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
            >
              {loadingMessages ? "Loading..." : "Fetch Messages"}
            </button>

            {content.length > 0 && (
              <div className="mt-4 p-3 bg-green-50 rounded">
                <p className="text-sm text-gray-600">
                  Found: <span className="font-semibold text-gray-800">{content.length}</span> message(s)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Messages List */}
        {content.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Email Messages</h2>
            <div className="space-y-3">
              {content.map((ele) => (
                <div
                  key={ele.id}
                  onClick={() => setSelectedMessage(selectedMessage?.id === ele.id ? null : ele)}
                  className="p-4 border-l-4 border-blue-500 bg-blue-50 rounded-lg hover:shadow-md transition cursor-pointer"
                >
                  <div className="mb-2 flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Subject:</p>
                      <p className="text-gray-800 font-semibold">{ele.subject}</p>
                    </div>
                    <span className="text-xl ml-2">{selectedMessage?.id === ele.id ? "▼" : "▶"}</span>
                  </div>
                  {selectedMessage?.id === ele.id && (
                    <>
                      <hr className="my-3 border-blue-200" />
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Preview:</p>
                        <p className="text-gray-700 text-sm">{ele.intro}</p>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {content.length === 0 && email && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg">
              No messages yet. Click "Fetch Messages" to check for incoming emails.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
