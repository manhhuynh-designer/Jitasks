import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './src/components/ui/select'

export function Test() {
  return (
    <Select value="" onValueChange={() => {}}>
      <SelectTrigger>
        <SelectValue placeholder="test" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="test">test</SelectItem>
      </SelectContent>
    </Select>
  )
}
