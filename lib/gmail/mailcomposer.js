exports.compose = funtion(params) {
  var encodedResponse = btoa(
    "Content-Type: text/plain; charset=\"UTF-8\"\n" +
    "MIME-Version: 1.0\n" +
    "Content-Transfer-Encoding: 7bit\n" +
    "References: <CADsZLRxZDUGn4Frx80qe2_bE5H5bQhgcqGk=GwFN9gs7Z_8oZw@mail.gmail.com> <CADsZLRyzVPLRQuTthGSHKMCXL7Ora1jNW7h0jvoNgR+hU59BYg@mail.gmail.com> <CADsZLRwQWzLB-uq4_4G2E64NX9G6grn0cEeO0L=avY7ajzuAFg@mail.gmail.com>\n" +
    "In-Reply-To: <CADsZLRwQWzLB-uq4_4G2E64NX9G6grn0cEeO0L=avY7ajzuAFg@mail.gmail.com>\n" +
    "Subject: Re:Cool\n" +
    "From: sender@gmail.com\n" +
    "To: reciever@gmail.com\n\n" +

    "This is where the response text will go"
  ).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return encodedResponse;
};
