/**
 * Icon asset registry (#128 — Icon System Migration, implementations/ICON_SYSTEM.md).
 * All 29 assets are PNG, not SVG: the source art is photo-traced (single
 * `<path>` elements running to tens of thousands of characters), so an SVG
 * export would ship the same raster-level detail at 5-10x the size of a
 * pre-rasterized PNG for no scaling benefit. See ICON_SYSTEM.md's "Format
 * reconsidered" note.
 */
export const ICONS = {
  airplane: require('../../../assets/icons/airplane.png'),
  bell: require('../../../assets/icons/bell.png'),
  'book-idea': require('../../../assets/icons/book-idea.png'),
  brain: require('../../../assets/icons/brain.png'),
  car: require('../../../assets/icons/car.png'),
  'check-circle': require('../../../assets/icons/check-circle.png'),
  confetti: require('../../../assets/icons/confetti.png'),
  crown: require('../../../assets/icons/crown.png'),
  diamond: require('../../../assets/icons/diamond.png'),
  flame: require('../../../assets/icons/flame.png'),
  'game-controller': require('../../../assets/icons/game-controller.png'),
  gift: require('../../../assets/icons/gift.png'),
  house: require('../../../assets/icons/house.png'),
  laptop: require('../../../assets/icons/laptop.png'),
  lightning: require('../../../assets/icons/lightning.png'),
  padlock: require('../../../assets/icons/padlock.png'),
  pencil: require('../../../assets/icons/pencil.png'),
  'pie-chart': require('../../../assets/icons/pie-chart.png'),
  'pill-bottle': require('../../../assets/icons/pill-bottle.png'),
  receipt: require('../../../assets/icons/receipt.png'),
  rocket: require('../../../assets/icons/rocket.png'),
  seedling: require('../../../assets/icons/seedling.png'),
  'shield-check': require('../../../assets/icons/shield-check.png'),
  'shopping-cart': require('../../../assets/icons/shopping-cart.png'),
  'star-podium': require('../../../assets/icons/star-podium.png'),
  target: require('../../../assets/icons/target.png'),
  'transport-scene': require('../../../assets/icons/transport-scene.png'),
  trophy: require('../../../assets/icons/trophy.png'),
  'warning-triangle': require('../../../assets/icons/warning-triangle.png'),
} as const;

export type IconName = keyof typeof ICONS;
