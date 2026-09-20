export const HOST_ENVIRONMENT_IMPORT = 'harbor_dsh_evolution.host_environment:HostEnvironment'

export function resolveExecutionEnvironment(config = {}, args = {}) {
  const kind = String(args.executionEnvironment ?? config.executionEnvironment ?? 'host').trim().toLowerCase()
  if (!['host', 'docker'].includes(kind)) {
    throw new Error('executionEnvironment must be host or docker')
  }
  return {
    kind,
    harborArgs: kind === 'host'
      ? ['-e', HOST_ENVIRONMENT_IMPORT, '--cpus', 'ignore', '--memory', 'ignore', '-y']
      : ['-e', 'docker'],
    gatewayAdvertisedHost: kind === 'host'
      ? '127.0.0.1'
      : (config.modelBrokerAdvertisedHost || 'host.docker.internal'),
  }
}
