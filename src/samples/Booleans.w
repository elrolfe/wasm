constant boolean yes = true;

export main() {
  number a = 5;
  if (a > 4) {
    system.output(a);
  } else {
    system.output(0);
  }

  boolean no = !yes;
  if (negate(no)) {
    system.output(1);
  }
}

negate(boolean term): boolean {
  return !term;
}