import axios from "axios";
import { throwError } from "./responseMessages.js";

export const getCountryDataFromApi = async (nameEn, lang) => {
  let apiResponse;
  try {
    apiResponse = await axios.get(
      `https://restcountries.com/v3.1/name/${encodeURIComponent(nameEn)}?fullText=true`,
    );
  } catch (err) {
    throwError("invalid_name", lang, { name: nameEn });
  }

  if (!apiResponse.data || apiResponse.data.length === 0) {
    throwError("invalid_name", lang, { name: nameEn });
  }

  const apiCountry = apiResponse.data[0];
  const phoneCode =
    apiCountry.idd.root +
    (apiCountry.idd.suffixes ? apiCountry.idd.suffixes[0] : "");
  const flag = apiCountry.flags.png || apiCountry.flags.svg;

  return { phoneCode, flag };
};
