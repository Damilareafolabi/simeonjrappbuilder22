import fs from "fs";

const html = `
<!DOCTYPE html>
<html>
<head>
  <title>SimeonJr Transform Test</title>
</head>
<body>
  <h1>Hello World</h1>
  <p>This is the original application.</p>
</body>
</html>
`;

fs.writeFileSync("index.html", html);
console.log("BUILD SUCCESS");
