import chalk from 'chalk';
import gradient from 'gradient-string';

const CANDY = `
    _....._
  .' _..._ '.
 / /\`  __ \`\\ \\
; ;  /\`  \\  | ;
| | |  (_/  ; |
; ;  \\_  _.' .;
 \\ '.  \`\` _.'/
  '._\`"'"\`_.'`;

const STICK = `
    /  /\`\`
   /  /
  /__/`;

const TITLE = 'Rollipop';
const DESCRIPTIONS = [TITLE, 'Modern build toolkit for React Native', 'Powered by Rolldown'];
const PRIMARY_COLOR = '#42A5F5';
const SECONDARY_COLOR = '#BBDEFB';
const BASE_GRADIENT_COLORS = [PRIMARY_COLOR, SECONDARY_COLOR];
const PADDING = 20;

function printLogo() {
  let maxLogoWidth = 0;
  const padding = ' '.repeat(PADDING);
  const gradientColors = [...BASE_GRADIENT_COLORS];
  const styledCandy =
    CANDY.split('\n')
      .map((line) => {
        maxLogoWidth = Math.max(line.length, maxLogoWidth);
        return gradient(gradientColors.reverse())(line);
      })
      .join('\n') + STICK;

  console.log(
    styledCandy
      .split('\n')
      .map((line) => padding + line)
      .join('\n'),
  );

  console.log(''); // empty line

  DESCRIPTIONS.forEach((description, index) => {
    const descriptionHalfLength = description.length / 2;
    const logoHalfWidth = maxLogoWidth / 2;
    const padding = ' '.repeat(PADDING - descriptionHalfLength + logoHalfWidth);

    if (index === 0) {
      console.log(padding + chalk.bold.hex(PRIMARY_COLOR)(description));
    } else {
      console.log(padding + description);
    }
  });

  console.log(''); // empty line
}

export const Logo = {
  _printed: false,
  printLogo,
  printLogoOnce: () => {
    if (Logo._printed) {
      return;
    }
    Logo._printed = true;
    printLogo();
  },
};
