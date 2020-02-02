export main() {
  number i = 0;

  while (i < 10) {
    i = i + 1;
    system.output(i);
  }

  do {
    system.output(i);
    i = i - 1;
  } while (i > 0);

  number a = 2;
  number b = 7;

  for (i in a..b) {
    system.output(i);
  }

  for (i in b..a step -1) {
    system.output(i);
  }
}