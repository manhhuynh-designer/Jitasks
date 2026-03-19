---
name: Premium Dialog Design
description: Guide for creating consistent, high-end dialogs with glassmorphism effects and premium typography.
---

# Premium Dialog Design Skill

This skill defines the standard for "Premium" dialogs in the Jitasks application, ensuring a consistent and high-end user experience.

## Design Principles

- **Glassmorphism**: Use the `.glass-premium` class for the dialog background.
- **High Contrast Typography**: Use `font-black` for titles and uppercase tracking for labels.
- **Generous Spacing**: Use `p-8` for padding and `space-y-6` for form sections.
- **Soft Corners**: Use `rounded-[2.5rem]` for the main container and `rounded-2xl` for inputs/buttons.

## Component Specifications

### Dialog Content
```tsx
<DialogContent className="sm:max-w-[425px] rounded-[2.5rem] border-none glass-premium p-8">
```

### Typography
- **Title**: `text-2xl font-black text-slate-800 tracking-tight`
- **Description**: `text-muted-foreground font-medium leading-relaxed`
- **Labels**: `text-xs font-black uppercase tracking-widest text-slate-400 ml-1`

### Form Elements
- **Inputs/Selects**: `rounded-2xl h-12 bg-white/50 border-none focus-visible:ring-primary/20 font-medium`
- **Primary Button**: `w-full rounded-2xl h-14 font-bold text-lg shadow-lg shadow-primary/20`

### Icons
- Use a `h-12 w-12 rounded-2xl` background with a colored icon for the header:
```tsx
<div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
  <Icon className="h-6 w-6 text-primary" />
</div>
```

## Structure Pattern

```tsx
<Dialog>
  <DialogTrigger>...</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <IconHeader />
      <DialogTitle>...</DialogTitle>
      <DialogDescription>...</DialogDescription>
    </DialogHeader>
    <form>
      <FormField>
        <Label>...</Label>
        <Input />
      </FormField>
      <DialogFooter>
        <SubmitButton />
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```
