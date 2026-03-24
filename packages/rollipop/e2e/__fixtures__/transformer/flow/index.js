// @flow
type Props = {
  name: string,
  age: number,
};

function greet(props: Props): string {
  return `${props.name} is ${props.age}`;
}

console.log(greet({ name: 'Alice', age: 30 }));
