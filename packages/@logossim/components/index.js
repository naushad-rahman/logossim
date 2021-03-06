import And from './And/AndRegister';
import Buffer from './Buffer/BufferRegister';
import Button from './Button/ButtonRegister';
import Clock from './Clock/ClockRegister';
import Nand from './Nand/NandRegister';
import Nor from './Nor/NorRegister';
import Not from './Not/NotRegister';
import Or from './Or/OrRegister';
import Xnor from './Xnor/XnorRegister';
import Xor from './Xor/XorRegister';

const components = [
  And,
  Nand,
  Or,
  Nor,
  Xor,
  Xnor,
  Buffer,
  Not,
  Button,
  Clock,
];

export default components;

export const groupedComponents = components.reduce(
  (acc, component) => {
    const group = acc.find(g => g.name === component.group);

    if (group) group.components.push(component);
    else acc.push({ name: component.group, components: [component] });

    return acc;
  },
  [],
);
