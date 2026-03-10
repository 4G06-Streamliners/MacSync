export function createDbChain(result: any = []) {
  const chain: any = {};
  chain.then = (resolve: any, reject: any) =>
    Promise.resolve(result).then(resolve, reject);
  chain.catch = (fn: any) => Promise.resolve(result).catch(fn);

  [
    'select',
    'from',
    'where',
    'orderBy',
    'limit',
    'innerJoin',
    'leftJoin',
    'insert',
    'values',
    'returning',
    'update',
    'set',
    'delete',
  ].forEach((method) => {
    chain[method] = jest.fn().mockReturnValue(chain);
  });

  return chain;
}
