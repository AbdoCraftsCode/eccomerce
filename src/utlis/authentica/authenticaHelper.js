import axios from "axios";

const AUTHENTICA_API_KEY = "ad5348edf3msh15d5daec987b64cp183e9fjsne1092498134c";
const AUTHENTICA_BASE_URL = "https://authentica1.p.rapidapi.com/api/v2";

export async function sendOTP(phone, method = "whatsapp") {
  try {
    const response = await axios.post(
      `${AUTHENTICA_BASE_URL}/send-otp`,
      {
        method: method,
        phone: phone,
      },
      {
        headers: {
          "x-rapidapi-key": AUTHENTICA_API_KEY,
          "x-rapidapi-host": "authentica1.p.rapidapi.com",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );

    console.log("OTP Sent Successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("Failed to Send OTP:", error.response?.data || error.message);
    throw error;
  }
}

export async function verifyAuthOTP(phone, otp) {
  try {
    const response = await axios.post(
      `${AUTHENTICA_BASE_URL}/verify-otp`,
      {
        phone: phone,
        otp: otp,
      },
      {
        headers: {
          "x-rapidapi-key": AUTHENTICA_API_KEY,
          "x-rapidapi-host": "authentica1.p.rapidapi.com",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );

    console.log("OTP Verified:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Failed to Verify OTP:",
      error.response?.data || error.message,
    );
    return error.response?.data || { status: false, message: error.message };
  }
}
