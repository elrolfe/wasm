/*
    System Output Demonstration

    This script defines two functions, main and test, and exports main to be called from
    JavaScript.  The main function calls system.output, passing it the result of the
    test function added to 3.

    The test function returns the result of the expression 1 + 2.

    The JavaScript function mapped to system.out should receive the value 6 as an argument.
*/

export main() {               // Main has no return value, and is exported
  system.output(test() + 3);  
}

test() : number {  // Test returns a number value, and is not exported
  return 1 + 2;
}