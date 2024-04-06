import "./App.css";
import axios, { HttpStatusCode } from "axios";
import React, { useState, useEffect } from "react";
const NodeRSA = require("node-rsa");

function App() {
  const [mailContent, setMailContent] = useState({});
  // const [decrypted, setDecrypted] = useState(false);
  // const [forwardable, setForwardable] = useState(true);

  const getMailStorageDetails = async () => {
    const messageId = getMessageIdFromQuery();
    const mailContent = (
      await axios.get(`http://0.0.0.0:3000/mail/${messageId}`)
    ).data;
    console.log(mailContent, "from mailserver");
    if (mailContent.forwardable) {
      decryptAndShow(mailContent);
    } else {
      // Create a <style> element
      const style = document.createElement("style");
      style.type = "text/css";

      // Define the CSS rules for @media print
      const css = `
        @media print {
          html, body {
            display: none;
          }
        }

        html {
          user-select: none;
        }

      `;

      // Set the text content of the <style> element to the CSS rules
      style.textContent = css;

      // Append the <style> element to the <head> of the document
      document.head.appendChild(style);
      await requestAccess(messageId);
    }

    // setMailContent(mailContent);
  };

  const requestAccess = async (messageId) => {
    const token = await getToken(messageId);
    document.getElementById("mail").textContent = "Send Mail";
    document.getElementById("mail").addEventListener("click", () => {
      sendMail(token);
    });
    let loop = true;
    while (loop) {
      try {
        const mailData = await getMailData(token);
        if (mailData.verified) {
          loop = false;
          if (mailData.depth === 0)
            setMailContent(mailData.content.replace(/<[^>]*>/g, ""));
          else decryptAndShow(mailData);
        }
        console.log(mailData);
      } catch (error) {
        if (error.response.status === HttpStatusCode.Forbidden) {
          console.log("enterss heree");
          document.getElementById("mail").textContent =
            "Sorry, this mail is not meant for you!";
          document.getElementById("mail").removeEventListener("click");
        }
        throw error;
      }
      await sleep(3000);
    }
  };

  const getMailData = async (token) => {
    const mailData = (
      await axios.get(`http://0.0.0.0:3000/mail/token/${token}`)
    ).data;
    return mailData;
  };

  const decryptAndShow = async (mailContent) => {
    console.log("comes inside with", mailContent);
    const publicKeyOfFrom = (
      await axios.get(`http://0.0.0.0:3000/user/public-key/${mailContent.from}`)
    ).data.publicKey;
    const decryptKey = new NodeRSA(publicKeyOfFrom, "public");
    console.log(mailContent);
    setMailContent(
      decryptKey
        .decryptPublic(mailContent.content.replace(/<[^>]*>/g, ""), "utf8")
        .replace(/<[^>]*>/g, "")
    );
  };

  const getToken = async (queryParams) => {
    console.log(queryParams);
    const token = (
      await axios.post(`http://0.0.0.0:3000/mail/get-token`, {
        messageId: queryParams,
      })
    ).data;
    // Update the content of the <p> tag with the generated token
    console.log(token);
    // document.querySelector("p").textContent = "Token: " + token;
    return token;
  };

  const getMessageIdFromQuery = () => {
    var queryParams = {};
    var queryString = window.location.search.substring(1);
    var queryStrings = queryString.split("&");
    for (var i = 0; i < queryStrings.length; i++) {
      var keyValue = queryStrings[i].split("=");
      var key = decodeURIComponent(keyValue[0]);
      var value = decodeURIComponent(keyValue[1]);
      queryParams[key] = value;
    }
    return queryParams["messageId"];
  };

  const sendMail = (token) => {
    const link = `mailto:admin@kryptmail.com?subject=${encodeURIComponent(
      token
    )}&body=${encodeURIComponent("Requesting Access")}`;
    window.open(link);
    // const access = new EventSource("http://0.0.0.0:3000/mail/request-access");
    // access.onmessage = ({ data }) => {
    //   console.log(JSON.parse(data));
    // };
  };

  useEffect(() => {
    if (typeof mailContent !== "string") getMailStorageDetails();
  });

  return (
    <div className="App">
      <h1>Kryptmail</h1>
      {mailContent.forwardable || typeof mailContent === "string" ? (
        mailContent
      ) : (
        <>
          <p>
            This mail is confidential and requires you to send a request mail
          </p>
          <span id="mail"></span>
        </>
      )}
    </div>
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default App;
