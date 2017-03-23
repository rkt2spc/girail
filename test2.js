var s = "Tuan Nguyen <nmtuan.dev@gmail.com>";
s = s.match(/<.+@.+>/g)[0];
s = s.replace(/[<>]/g, '');
console.log(s);