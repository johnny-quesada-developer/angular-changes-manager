import { SimpleChange, SimpleChanges } from '@angular/core';
import { TChangesSummary } from './ChangesManager.types';

/**
 * Return true if the simple change really changed
 * avoid the first change
 */
export const didPropertyChange = (simpleChange: SimpleChange): boolean => {
  const { previousValue, currentValue, firstChange } = simpleChange ?? {};
  const shouldIgnoreChange = firstChange || simpleChange === undefined;

  if (shouldIgnoreChange) return false;

  const isValueTheSame = Object.is(currentValue, previousValue);
  if (isValueTheSame) return false;

  return true;
};

/**
 * Add and extra property to the simple changes object to indicate if the property changed
 * didChange: boolean - true if the property changed
 * @param simpleChanges - SimpleChanges object from @angular/core
 * @returns TChangesSummary - SimpleChanges object with an extra property to indicate if the property really changed
 */
export const getChangesSummary = <TComponent extends object>(
  simpleChanges: SimpleChanges
): TChangesSummary<TComponent> => {
  const properties = Object.keys(simpleChanges);

  const changesSummary = properties.reduce((accumulator, property) => {
    const simpleChange = simpleChanges[property];

    return {
      ...accumulator,
      [property]: {
        ...simpleChange,
        didChange: didPropertyChange(simpleChange),
      },
    };
  }, {} as TChangesSummary<TComponent>);

  return changesSummary;
};

/**
 * Return true if the simple changes was processed
 */
export const tryComponentSimpleChange = <
  TComponent extends object,
  TValue,
  TFunction extends (newValue: TValue) => void
>({
  simpleChange,
  callback,
  component,
}: {
  simpleChange: SimpleChange;
  callback: TFunction;
  component: TComponent;
}): boolean => {
  if (!didPropertyChange(simpleChange)) return false;
  const { currentValue } = simpleChange;

  callback.call(component, currentValue);
  return true;
};

/**
 * Debounce the execution of a function
 */
export const debounce = <T extends Function>(callback: T, wait = 300): T => {
  let timer: NodeJS.Timeout;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      callback(...args);
    }, wait);
  }) as unknown as T;
};
