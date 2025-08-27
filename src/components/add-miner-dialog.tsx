'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import type { MinerConfig } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const ACCENT_COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "hsl(var(--primary))",
];

const formSchema = z.object({
  ipAddress: z.string().min(1, { message: 'IP address is required.' }).refine((ip) => {
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    return ipRegex.test(ip);
  }, { message: 'Please enter a valid IPv4 address.' }),
  name: z.string().optional(),
  accentColor: z.string().optional(),
});

type AddMinerDialogProps = {
  onAddMiner: (minerConfig: MinerConfig) => void;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export function AddMinerDialog({ onAddMiner, isOpen, onOpenChange }: AddMinerDialogProps) {
  const isMobile = useIsMobile();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ipAddress: '',
      name: '',
      accentColor: ACCENT_COLORS[0],
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    onAddMiner({
        ip: values.ipAddress,
        name: values.name || '',
        accentColor: values.accentColor || ACCENT_COLORS[0],
    });
    form.reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={cn("w-full max-w-md overflow-y-auto max-h-[90vh]", { "max-w-[95vw]": isMobile })}>
        <DialogHeader>
          <DialogTitle>Add a New Miner</DialogTitle>
          <DialogDescription>
            Enter the details of your Axe OS miner to start monitoring.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="ipAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Miner IP Address</FormLabel>
                  <FormControl>
                    <Input placeholder="192.168.1.100" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Miner Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="My First Miner" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accentColor"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Accent Color</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-wrap gap-2"
                    >
                      {ACCENT_COLORS.map((color) => (
                        <FormItem key={color} className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value={color} className="sr-only" />
                          </FormControl>
                          <FormLabel 
                            className={cn(
                                "h-8 w-8 rounded-full border-2 border-transparent cursor-pointer",
                                field.value === color && "ring-2 ring-ring ring-offset-2 ring-offset-background"
                            )} 
                            style={{ backgroundColor: color }}
                          />
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Add Miner</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
