import { ChangeDetectorRef, SimpleChange, SimpleChanges } from '@angular/core';
import { ChangesManager } from '../src/ChangesManager';
import {
  TCallbacksConfigParameter,
  TChangesSummary,
} from '../src/ChangesManager.types';
import { createDecoupledPromise } from 'cancelable-promise-jq';

const createChangeDetectorRef = () => {
  return {
    markForCheck: jest.fn(),
    detach: jest.fn(),
    detectChanges: jest.fn(),
    reattach: jest.fn(),
  } as unknown as ChangeDetectorRef;
};

const createChangesManager = <TComponent extends object>(parameters: {
  component: TComponent;
  changeDetectorRef: ChangeDetectorRef;
  callbacks?: TCallbacksConfigParameter<TComponent>;
  bedounceDelay?: number;
}) => {
  const changesManager = new ChangesManager(parameters);

  return changesManager as unknown as Omit<
    typeof changesManager,
    'changeDetectorRef'
  > & {
    changeDetectorRef: ChangeDetectorRef;
  };
};

const createSimpleChangeObject = <T>(value: T, previousValue: T) => {
  return {
    previousValue: value,
    currentValue: previousValue,
    firstChange: false,
  } as SimpleChange;
};

describe('ChangesManager', () => {
  it('should build basic changes manager', () => {
    const changeDetectorRef = createChangeDetectorRef();
    const component = {};

    const changesManager = createChangesManager({
      component,
      changeDetectorRef,
    });

    expect(changesManager).toBeDefined();
    expect(
      changesManager.changeDetectorRef.detectChanges
    ).not.toHaveBeenCalled();
  });

  it('should manage changes with simple callbacks configuration', () => {
    expect.assertions(3);

    const { promise, ...tools } = createDecoupledPromise();

    const changeDetectorRef = createChangeDetectorRef();
    const component = {
      property1: 'value1',
    };

    const callback1 = jest.fn((summary: TChangesSummary<typeof component>) => {
      expect(summary.property1.didChange).toBe(true);
    });

    const changesManager = createChangesManager({
      component,
      changeDetectorRef,
      callbacks: {
        property1: callback1,
      },
    });

    const simpleChanges = {
      property1: createSimpleChangeObject('value1', 'value2'),
    } as SimpleChanges;

    changesManager.manageChanges(simpleChanges);

    // the execution of the changes manager is debounced so we need to wait for the execution
    setTimeout(() => {
      expect(callback1).toHaveBeenCalled();
      expect(changesManager.changeDetectorRef.detectChanges).toHaveBeenCalled();

      tools.resolve();
    }, 0);

    return promise;
  });

  it('should avoid executing the callback if the property did not change', () => {
    expect.assertions(2);

    const { promise, ...tools } = createDecoupledPromise();

    const changeDetectorRef = createChangeDetectorRef();
    const component = {
      property1: 'value1',
    };

    const callback1 = jest.fn((summary: TChangesSummary<typeof component>) => {
      expect(summary.property1.didChange).toBe(false);
    });

    const changesManager = createChangesManager({
      component,
      changeDetectorRef,
      callbacks: {
        property1: callback1,
      },
    });

    const simpleChanges = {
      property1: createSimpleChangeObject('value1', 'value1'),
    } as SimpleChanges;

    changesManager.manageChanges(simpleChanges);

    // the execution of the changes manager is debounced so we need to wait for the execution
    setTimeout(() => {
      expect(callback1).not.toHaveBeenCalled();
      expect(
        changesManager.changeDetectorRef.detectChanges
      ).not.toHaveBeenCalled();

      tools.resolve();
    }, 0);

    return promise;
  });

  it('should avoid executing the callback if the property is not present in the simple changes', () => {
    expect.assertions(2);

    const { promise, ...tools } = createDecoupledPromise();

    const changeDetectorRef = createChangeDetectorRef();
    const component = {
      property1: 'value1',
    };

    const callback1 = jest.fn((summary: TChangesSummary<typeof component>) => {
      expect(summary.property1.didChange).toBe(false);
    });

    const changesManager = createChangesManager({
      component,
      changeDetectorRef,
      callbacks: {
        property1: callback1,
      },
    });

    const simpleChanges = {} as SimpleChanges;

    changesManager.manageChanges(simpleChanges);

    // the execution of the changes manager is debounced so we need to wait for the execution
    setTimeout(() => {
      expect(callback1).not.toHaveBeenCalled();
      expect(
        changesManager.changeDetectorRef.detectChanges
      ).not.toHaveBeenCalled();

      tools.resolve();
    }, 0);

    return promise;
  });

  it('should manage changes with complex callbacks configuration', () => {
    expect.assertions(4);

    const { promise, ...tools } = createDecoupledPromise();

    const changeDetectorRef = createChangeDetectorRef();
    const component = {
      name: 'johnny',
      surname: '',
    };

    const callback1 = jest.fn((summary: TChangesSummary<typeof component>) => {
      expect(summary.name).toBe(undefined);
      expect(summary.surname.didChange).toBe(true);
    });

    const changesManager = createChangesManager({
      component,
      changeDetectorRef,
      callbacks: [[['name', 'surname'], callback1]],
    });

    const simpleChanges = {
      surname: createSimpleChangeObject('', 'quesada'),
    } as SimpleChanges;

    changesManager.manageChanges(simpleChanges);

    // the execution of the changes manager is debounced so we need to wait for the execution
    setTimeout(() => {
      expect(callback1).toHaveBeenCalled();
      expect(changesManager.changeDetectorRef.detectChanges).toHaveBeenCalled();

      tools.resolve();
    }, 0);

    return promise;
  });

  it('should avoid executing twice the same callback when the callback is linked to multiple properties and all of them change', () => {
    expect.assertions(4);

    const { promise, ...tools } = createDecoupledPromise();

    const changeDetectorRef = createChangeDetectorRef();
    const component = {
      name: '',
      surname: '',
    };

    const callback1 = jest.fn((summary: TChangesSummary<typeof component>) => {
      expect(summary.name.didChange).toBe(true);
      expect(summary.surname.didChange).toBe(true);
    });

    const changesManager = createChangesManager({
      component,
      changeDetectorRef,
      callbacks: [[['name', 'surname'], callback1]],
    });

    const simpleChanges = {
      name: createSimpleChangeObject('', 'johnny'),
      surname: createSimpleChangeObject('', 'quesada'),
    } as SimpleChanges;

    changesManager.manageChanges(simpleChanges);

    // the execution of the changes manager is debounced so we need to wait for the execution
    setTimeout(() => {
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(
        changesManager.changeDetectorRef.detectChanges
      ).toHaveBeenCalledTimes(1);

      tools.resolve();
    }, 0);

    return promise;
  });

  it('should execute all the callbacks when calling executeCallbacks', () => {
    const { promise, ...tools } = createDecoupledPromise();

    const changeDetectorRef = createChangeDetectorRef();

    const component = {
      name: '',
      surname: '',
    };

    const callback1 = jest.fn();
    const callback2 = jest.fn();

    const changesManager = createChangesManager({
      component,
      changeDetectorRef,
      callbacks: {
        name: callback1,
        surname: callback2,
      },
    });

    changesManager.executeCallbacks();

    // the execution of the changes manager is debounced so we need to wait for the execution
    setTimeout(() => {
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);

      tools.resolve();
    }, 0);

    return promise;
  });
});
