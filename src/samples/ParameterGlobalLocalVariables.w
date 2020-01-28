/*
  Global and Local variables, and Parameters
*/

// Define global variable z and assign it an initial value of 10
number z = 10;

export main() {
  number a = add(1, 2);   // Add 1 and 2, and initialize local variable a with the result;
  system.output(a);       // Should output 3
  system.output(z);       // Should output 10, z should not have changed after calling add
  a = a + z;              // Add the value of z (10) to a (3) and store the result in a
  system.output(a);       // Should output 13

  z = z + 1;              // Increment z
  system.output(z);       // Should output 11
}

// Function to add two numbers together
add(number a, number b) : number {
  number z = a + b;  // Define local variable z, which takes precedence over the global variable z
  return z;          // Return the addition result
}