'use client';

import { Box, Table, Text } from '@chakra-ui/react';
import { useState, useMemo } from 'react';
import { Select } from '@/app/components/ui/Select';
import { Checkbox } from '@/app/components/ui/Checkbox';

export type DeviceType = 'smart_lock' | 'relay_gate' | 'smoke_sensor' | 'thermostat' | 'alarm_sensors' | 'lights' | 'ring_cam' | 'scenes' | 'ups';

export type DeviceController = 'api' | 'home_assistant';

export type DevicePackageItem = {
    enabled: boolean;
    controllable: boolean;
    controller: DeviceController;
};

function getDeviceLabel(deviceType: DeviceType): string {
    const labels: Record<DeviceType, string> = {
        smart_lock: 'Smart Lock (porta appartamento)',
        relay_gate: 'Relay cancello/portone (Shelly)',
        smoke_sensor: 'Sensore fumo',
        thermostat: 'Termostato',
        alarm_sensors: 'Allarme + sensori porta/finestra',
        lights: 'Luci (Shelly)',
        ring_cam: 'Ring / cam',
        scenes: 'Scene (preset)',
        ups: 'UPS presente',
    };
    return labels[deviceType] ?? deviceType;
}

type DeviceTableProps = {
    deviceTypes: DeviceType[];
    allDevices: Array<{ deviceType: DeviceType } & DevicePackageItem>;
};

function getControllerOptions(deviceType: DeviceType): Array<{ value: DeviceController; label: string }> {
    if (deviceType === 'ups') {
        return [];
    }

    return [
        { value: 'api', label: 'API' },
        { value: 'home_assistant', label: 'Home Assistant' },
    ];
}

type DeviceState = {
    enabled: boolean;
    controllable: boolean;
    controller: DeviceController;
};

export function DeviceTable({ deviceTypes, allDevices }: DeviceTableProps) {
    // Initialize state from props
    const initialState = useMemo(() => {
        const state: Record<DeviceType, DeviceState> = {} as Record<DeviceType, DeviceState>;
        deviceTypes.forEach((deviceType) => {
            const item = allDevices.find((d) => d.deviceType === deviceType);
            state[deviceType] = {
                enabled: item?.enabled ?? false,
                controllable: item?.controllable ?? false,
                controller: item?.controller ?? 'home_assistant',
            };
        });
        return state;
    }, [deviceTypes, allDevices]);

    const [deviceStates, setDeviceStates] = useState<Record<DeviceType, DeviceState>>(initialState);

    const handleEnabledChange = (deviceType: DeviceType, checked: boolean) => {
        setDeviceStates((prev) => {
            const newState = { ...prev };
            newState[deviceType] = {
                ...newState[deviceType],
                enabled: checked,
                // Reset controllable and controller when disabled
                controllable: checked ? newState[deviceType].controllable : false,
                controller: checked ? newState[deviceType].controller : 'home_assistant',
            };
            return newState;
        });
    };

    const handleControllableChange = (deviceType: DeviceType, checked: boolean) => {
        setDeviceStates((prev) => ({
            ...prev,
            [deviceType]: {
                ...prev[deviceType],
                controllable: checked,
            },
        }));
    };

    const handleControllerChange = (deviceType: DeviceType, value: DeviceController) => {
        setDeviceStates((prev) => ({
            ...prev,
            [deviceType]: {
                ...prev[deviceType],
                controller: value,
            },
        }));
    };
    return (
        <Box position='relative'>
            <Box
                overflowX='auto'
                css={{
                    '&::-webkit-scrollbar': {
                        height: '4px',
                    },
                    '&::-webkit-scrollbar-track': {
                        background: 'transparent',
                    },
                    '&::-webkit-scrollbar-thumb': {
                        background: 'var(--border-light)',
                        borderRadius: '2px',
                    },
                }}>
                <Table.Root minW='600px' w='100%'>
                    <Table.Header>
                        <Table.Row borderBottom='1px solid' borderColor='var(--border-light)'>
                            <Table.ColumnHeader textAlign='left' py={3} px={4} fontSize='sm' fontWeight='semibold' color='var(--text-primary)'>
                                Device
                            </Table.ColumnHeader>
                            <Table.ColumnHeader textAlign='center' py={3} px={4} fontSize='sm' fontWeight='semibold' color='var(--text-primary)'>
                                Presente
                            </Table.ColumnHeader>
                            <Table.ColumnHeader textAlign='center' py={3} px={4} fontSize='sm' fontWeight='semibold' color='var(--text-primary)'>
                                Controllabile
                            </Table.ColumnHeader>
                            <Table.ColumnHeader textAlign='center' py={3} px={4} fontSize='sm' fontWeight='semibold' color='var(--text-primary)'>
                                Controller
                            </Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {deviceTypes.map((deviceType) => {
                            const state = deviceStates[deviceType];
                            const enabled = state.enabled;
                            const controllable = state.controllable;
                            const controller = state.controller;
                            const enabledId = `device_${deviceType}_enabled`;
                            const controllableId = `device_${deviceType}_controllable`;
                            const controllerId = `device_${deviceType}_controller`;
                            const controllerOptions = getControllerOptions(deviceType);
                            const isUps = deviceType === 'ups';

                            return (
                                <Table.Row key={deviceType} borderBottom='1px solid' borderColor='var(--border-light)' _hover={{ bg: 'var(--bg-card)' }}>
                                    <Table.Cell py={3} px={4}>
                                        <Text fontSize='sm' fontWeight='medium'>
                                            {getDeviceLabel(deviceType)}
                                        </Text>
                                        <Text fontSize='xs' opacity={0.6} mt={0.5}>
                                            {deviceType}
                                        </Text>
                                    </Table.Cell>
                                    <Table.Cell py={3} px={4} textAlign='center'>
                                        <Checkbox
                                            id={enabledId}
                                            name={enabledId}
                                            checked={enabled}
                                            size='md'
                                            colorScheme='cyan'
                                            onChange={(e) => {
                                                handleEnabledChange(deviceType, e.target.checked);
                                            }}
                                        />
                                    </Table.Cell>
                                    {!isUps && (
                                        <>
                                            <Table.Cell py={3} px={4} textAlign='center'>
                                                <Checkbox
                                                    id={controllableId}
                                                    name={`device_${deviceType}_controllable`}
                                                    checked={controllable}
                                                    disabled={!enabled}
                                                    size='md'
                                                    colorScheme='cyan'
                                                    opacity={!enabled ? 0.5 : 1}
                                                    cursor={!enabled ? 'not-allowed' : 'pointer'}
                                                    onChange={(e) => {
                                                        handleControllableChange(deviceType, e.target.checked);
                                                    }}
                                                />
                                            </Table.Cell>
                                            <Table.Cell py={3} px={4} textAlign='center'>
                                                <Select
                                                    id={controllerId}
                                                    name={controllerId}
                                                    value={controller}
                                                    disabled={!enabled}
                                                    fontSize='xs'
                                                    borderRadius='lg'
                                                    bg='var(--bg-secondary)'
                                                    border='1px solid'
                                                    borderColor='var(--border-light)'
                                                    px={3}
                                                    py={1.5}
                                                    color='var(--text-primary)'
                                                    _focus={{ outline: 'none', ring: '2px', ringColor: 'rgba(6, 182, 212, 1)', borderColor: 'rgba(6, 182, 212, 1)' }}
                                                    _hover={enabled ? { borderColor: 'rgba(6, 182, 212, 0.5)', bg: 'var(--bg-tertiary)' } : {}}
                                                    transition='all'
                                                    cursor={enabled ? 'pointer' : 'not-allowed'}
                                                    opacity={!enabled ? 0.5 : 1}
                                                    onChange={(e) => {
                                                        handleControllerChange(deviceType, e.target.value as DeviceController);
                                                    }}>
                                                    {controllerOptions.map((opt) => (
                                                        <option key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </option>
                                                    ))}
                                                </Select>
                                            </Table.Cell>
                                        </>
                                    )}
                                    {isUps && (
                                        <Table.Cell colSpan={2} py={3} px={4} textAlign='center' fontSize='xs' opacity={0.6}>
                                            Solo presenza fisica
                                        </Table.Cell>
                                    )}
                                </Table.Row>
                            );
                        })}
                    </Table.Body>
                </Table.Root>
            </Box>
            {/* Indicatore scroll su mobile */}
            <Box
                pointerEvents='none'
                position='absolute'
                top={0}
                right={0}
                bottom={0}
                w={16}
                bgGradient='to-l'
                gradientFrom='var(--bg-card)'
                gradientVia='rgba(var(--bg-card-rgb), 0.8)'
                gradientTo='transparent'
                display={{ base: 'flex', lg: 'none' }}
                alignItems='center'
                justifyContent='flex-end'
                pr={2}>
                <Text fontSize='xs' color='var(--text-secondary)' opacity={0.6}>
                    →
                </Text>
            </Box>
        </Box>
    );
}
